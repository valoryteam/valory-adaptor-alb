import {Context} from "aws-lambda";

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
	body?: string;
}