import { ObjectId } from 'mongodb';
import { decode, isValid, generateOTP, } from './jwt';

//const TypeError = require('./type_error');

export const isSignedIn = async (req, secret, usage = {}) => {
	//NO TOKEN NO ENTRY
	if(typeof req.cookies.token == 'undefined' || !req.cookies.token){
		return false;
	}

	try{
		req.token = decode(req.cookies.token);
		req.token.payload.id = ObjectId.createFromHexString(req.token.payload.id);
	}catch(error){
		return false;
	}

	//NOT NECISSARY UNLESS WE WANT SINGLE USE TOKENS
	if(req.token.payload.usage.type != 'ANY'){ //IF USAGE...
		for(const [key, value] of Object.entries(usage)){
			if(req.token.payload.usage[key] != value){
				return false;
			}
		}
	}

	//SESSION DIED - VERIFY TOKEN
	if(!req.session.signature){
		const integrity = await verifyIntegrity(req);
		if(!integrity.valid){
			return false;
		}

		const valid = isValid(req.cookies.token, secret+generateOTP(integrity.secret, parseInt((req.token.payload.exp/60).toString())));
		if(valid){
			req.session.signature = req.token.signature;
			req.session.secret = integrity.secret;
		}
		return valid;
	}

	//VERIFY SIGNATURE MATCHES AND PAYLOAD IS VALID
	if(req.session.signature == req.token.signature){
		return isValid(req.cookies.token, secret+generateOTP(req.session.secret, parseInt((req.token.payload.exp/60).toString()))); //MAKE A BETTER PWD SYSTEM
	}

	return false;
};

async function verifyIntegrity(req){
	if(!req.token.payload.id || !req.token.payload.data){
		return {
			valid: false
		};
	}

	const data = await global.mongo.getDatabase().collection('users').findOne(
		{
			_id: req.token.payload.id
		},
		{
			projection: {
				_id: false,
				email: true,
				username: true,
				first_name: true,
				last_name: true,
				password: true,
				role: true
			}
		}
	);

	if(!data){
		return {
			valid: false
		};
	}

	data.role = (data.role) ? data.role : 0;

	return {
		valid: (req.token.payload.data.email == data.email &&
			req.token.payload.data.username == data.username &&
			req.token.payload.data.first_name == data.first_name &&
			req.token.payload.data.last_name == data.last_name &&
			req.token.payload.data.role == data.role),
		secret: data.password
	};
}

export const getUserID = (req) => {
	return req.token.payload.id;
};

export const getEmail = (req) => {
	return req.token.payload.data.email;
};

export const getUsername = (req) => {
	return req.token.payload.data.username;
};

export const getFirstName = (req) => {
	return req.token.payload.data.first_name;
};

export const getLastName = (req) => {
	return req.token.payload.data.last_name;
};

export const getRole = (req) => {
	return req.token.payload.data.role;
};
