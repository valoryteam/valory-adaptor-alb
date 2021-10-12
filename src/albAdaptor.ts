import FMW = require("find-my-way");
import {ApiRequest, ApiResponse, HttpMethod, AttachmentRegistry, ApiAdaptor, ApiContext} from "valory-runtime";
import {ALBRequestEvent, ALBResponse, Callback, Context, FormattedRequest} from "./types/alb";
import qs = require("querystring");

const prefix = process.env.PATH_PREFIX;
const pathReplacer = /{([\S]*?)}/g;
const default404: ALBResponse = {
	statusCode: 404,
	isBase64Encoded: false,
	headers: {
		"Content-Type": "application/json",
	},
	body: '{"message": "Not Found"}',
};

function noop<T>(x: T) {
	return x
}

export class ALBAdaptor implements ApiAdaptor {
	public static Base64EncodedKey = AttachmentRegistry.createKey<boolean>();
	public static Base64EncodeResponseKey = AttachmentRegistry.createKey<boolean>()
	public static LambdaContextKey = AttachmentRegistry.createKey<Context>();
	private router = FMW<FormattedRequest, Callback<ALBResponse>>({
		defaultRoute: (request, cb) => {
			cb(null, default404);
		},
	});

	public register(path: string, method: HttpMethod, handler: (ctx: ApiContext) => Promise<ApiContext>) {
		this.router.on(method, path.replace(pathReplacer, ":$1"), async (request, callback, params) => {
			const tranRequest = new ApiContext({
				headers: request.headers,
				pathParams: params,
				rawBody: request.body,
				method,
				path,
				query: qs.stringify(request.queryStringParameters, null, null, {encodeURIComponent: noop}),
				requestId: request.context.awsRequestId
			});
			tranRequest.attachments.putAttachment(ALBAdaptor.Base64EncodedKey, request.isBase64Encoded);
			tranRequest.attachments.putAttachment(ALBAdaptor.LambdaContextKey, request.context);
			await handler(tranRequest);
			const base64EncodeResponse = tranRequest.attachments.getAttachment(ALBAdaptor.Base64EncodeResponseKey) || false;
			const headers = tranRequest.prepareHeaders();

			/**
			 * 	ALB will reject the request if the content-length does not match the response we return, which is the case
			 * 	when returning base64 content
			 */
			delete headers['content-length'];

			callback(null, {
				isBase64Encoded: base64EncodeResponse,
				body: (base64EncodeResponse) ? Buffer.from(tranRequest.serializeResponse()).toString("base64") : tranRequest.serializeResponse(),
				headers,
				statusCode: tranRequest.response.statusCode,
			});
		});
	}

	public start() {
		// embed the lambda request handler in the export
		return {
			handler: this.handler.bind(this),
		} as any;
	}

	public shutdown() {
		// This should never be called
	}

	private handler(event: ALBRequestEvent, ctx: Context, cb: Callback<ALBResponse>) {
		const formatted: FormattedRequest = {
			requestContext: event.requestContext,
			context: ctx,
			body: event.body,
			headers: event.headers,
			method: event.httpMethod,
			isBase64Encoded: event.isBase64Encoded,
			queryStringParameters: event.queryStringParameters,
			url: event.path.replace(prefix, ""),
		};
		this.router.lookup(formatted, cb);
	}
}
