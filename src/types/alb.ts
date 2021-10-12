export interface ALBRequestEvent {
	requestContext: {
		elb: {
			targetGroupArn: string;
		};
	};
	httpMethod: string;
	path: string;
	queryStringParameters: {};
	headers: {[key: string]: string};
	body: string;
	isBase64Encoded: boolean;
}

export interface FormattedRequest {
	requestContext: {
		elb: {
			targetGroupArn: string;
		};
	};
	method: string;
	url: string;
	queryStringParameters: {};
	headers: {[key: string]: string};
	body: string;
	isBase64Encoded: boolean;
	context: Context;
}

export interface ALBResponse {
	statusCode: number;
	statusDescription?: string;
	isBase64Encoded: boolean;
	headers?: {[key: string]: string};
	body?: string | Buffer;
}

export interface Context {
	// Properties
	callbackWaitsForEmptyEventLoop: boolean;
	functionName: string;
	functionVersion: string;
	invokedFunctionArn: string;
	memoryLimitInMB: number;
	awsRequestId: string;
	logGroupName: string;
	logStreamName: string;
	identity?: CognitoIdentity;
	clientContext?: ClientContext;

	// Functions
	getRemainingTimeInMillis(): number;

	// Functions for compatibility with earlier Node.js Runtime v0.10.42
	// For more details see http://docs.aws.amazon.com/lambda/latest/dg/nodejs-prog-model-using-old-runtime.html#nodejs-prog-model-oldruntime-context-methods
	done(error?: Error, result?: any): void;
	fail(error: Error | string): void;
	succeed(messageOrObject: any): void;
	succeed(message: string, object: any): void;
}

export interface CognitoIdentity {
	cognitoIdentityId: string;
	cognitoIdentityPoolId: string;
}

export interface ClientContext {
	client: ClientContextClient;
	custom?: any;
	env: ClientContextEnv;
}

export interface ClientContextClient {
	installationId: string;
	appTitle: string;
	appVersionName: string;
	appVersionCode: string;
	appPackageName: string;
}

export interface ClientContextEnv {
	platformVersion: string;
	platform: string;
	make: string;
	model: string;
	locale: string;
}

export type Callback<TResult = any> = (error?: Error | null | string, result?: TResult) => void;
