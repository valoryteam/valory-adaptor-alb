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

export class ALBAdaptor implements ApiAdaptor {
	public static LambdaContextKey = AttachmentRegistry.createKey<Context>();
	public allowDocSite = true;
	public disableSerialization = false;
	public locallyRunnable = false;
	private router = FMW<FormattedRequest, Callback<ALBResponse>>({
		defaultRoute: (request, cb) => {
			cb(null, default404);
		},
	});

	public register(path: string, method: HttpMethod, handler: (ctx: ApiContext) => Promise<ApiContext>) {
		this.router.on(method, path.replace(pathReplacer, ":$1"), async (request, callback, params) => {
			const content = (request.isBase64Encoded) ? Buffer.from("base64").toString() : request.body;
			const tranRequest = new ApiContext({
				headers: request.headers,
				pathParams: params,
				rawBody: content,
				method,
				url: `${request.url}?${qs.stringify(request.queryStringParameters)}`
			});
			tranRequest.attachments.putAttachment(ALBAdaptor.LambdaContextKey, request.context);
			await handler(tranRequest);
			callback(null, {
				isBase64Encoded: false,
				body: tranRequest.serializeResponse(),
				headers: tranRequest.prepareHeaders(),
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
