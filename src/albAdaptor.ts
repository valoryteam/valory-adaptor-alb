import FMW = require("find-my-way");
import {ApiRequest, ApiResponse, ApiServer, HttpMethod, ValoryMetadata} from "valory-runtime";
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

export class ALBAdaptor implements ApiServer {
	public static LambdaContextKey = ApiRequest.createKey<Context>();
	public allowDocSite = true;
	public disableSerialization = false;
	public locallyRunnable = false;
	private router = FMW<FormattedRequest, Callback<ALBResponse>>({
		defaultRoute: (request, cb) => {
			cb(null, default404);
		},
	});

	public register(path: string, method: HttpMethod, handler: (request: ApiRequest) => (Promise<ApiResponse>)) {
		const route = `${path}:${method}`;
		this.router.on(HttpMethod[method], path.replace(pathReplacer, ":$1"), (request, callback, params) => {
			const content = (request.isBase64Encoded) ? Buffer.from("base64").toString() : request.body;
			const parsed = attemptParse(request.headers["content-type"], content);
			const tranRequest = new ApiRequest({
				headers: request.headers,
				query: request.queryStringParameters,
				path: params,
				body: parsed,
				rawBody: content,
				formData: parsed as any,
				route,
			});
			tranRequest.putAttachment(ALBAdaptor.LambdaContextKey, request.context);
			handler(tranRequest).then((response) => {
				const resContentType = response.headers["Content-Type"] || "text/plain";
				callback(null, {
					isBase64Encoded: false,
					body: serialize(resContentType, response.body),
					headers: response.headers,
					statusCode: response.statusCode,
				});
			});
		});
	}

	public getExport(metadata: ValoryMetadata, options: any): { valory: ValoryMetadata } {
		// embed the lambda request handler in the export
		return {
			valory: metadata,
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

function attemptParse(contentType: string, obj: any): any {
	if (contentType == null) {
		return obj;
	}
	const parsedContentType = contentType.split(":")[0];
	try {
		switch (parsedContentType) {
			case "application/json":
				return JSON.parse(obj);
			case "application/x-www-form-urlencoded":
				return qs.parse(obj);
			default:
				return obj;
		}
	} catch (err) {
		return obj;
	}
}

function serialize(contentType: string, data: any): string {
	if (data == null) {
		return "";
	} else if (typeof data !== "string") {
		return JSON.stringify(data);
	} else {
		return data;
	}
}
