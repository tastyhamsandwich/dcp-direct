import 'crypto';

const { createHmac } = await import('node:crypto');

export const generate = (headers, payload, secret) => {
	const message = base64UrlEncode(JSON.stringify(headers))+'.'+base64UrlEncode(JSON.stringify(payload));
	const signature = base64UrlEncode(createHmac('sha256', secret).update(message).digest());
	return message+'.'+signature;
};

export const isValid = (jwt: string, secret) => {
	const token = jwt.split('.');

	const expires = (JSON.parse(Buffer.from(token[1], 'base64').toString()) as any).exp < Date.now()/1000;
	const signature = base64UrlEncode(createHmac('sha256', secret).update(token[0]+'.'+token[1]).digest());

	if(expires || signature !== token[2]){
		return false;
	}
	
	return true;
};

export const decode = (jwt: string) => {
	const token = jwt.split('.');
	return {
		header: JSON.parse(Buffer.from(token[0], 'base64').toString()),
		payload: JSON.parse(Buffer.from(token[1], 'base64').toString()),
		signature: token[2]
	};
};

export const generateOTP = (secret, time) => {
	time = Buffer.from(time.toString(16).padStart(16, '0'), 'hex');
	const otp = createHmac('sha256', secret).update(time).digest('hex');
	return otp.substring(0, 6);
};

function base64UrlEncode(s){
	return Buffer.from(s).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}