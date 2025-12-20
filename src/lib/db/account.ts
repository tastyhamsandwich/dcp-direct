import { ObjectId, Long } from 'mongodb';
import { generateOTP, generate } from './jwt';
import { validateSolution } from './pow';
import { getUserID, getFirstName, getLastName, getRole } from './middleware';
import { removePrototype, checkForm } from './form';
import bcrypt from 'bcryptjs';

const FieldError = require('./field_error');
//const session = require('./session');

export const signIn = async (req, res) => {
    let check = [
        {
            key: 'email',
            type: 'EMAIL',
			required: true,
            min: 5,
            max: 64
        },
        {
            key: 'password',
            type: 'STRING',
			required: true,
            min: 6,
            max: 51
        },
        {
            key: 'pow',
            type: 'OBJECT',
            required: true,
            entries: [
				{
					key: 'challenge',
					type: 'STRING',
					required: true,
					pattern: /^[a-zA-Z0-9]+$/,
					min: 31,
					max: 64
				},
				{
					key: 'difficulty',
					type: 'NUMBER',
					required: true,
					min: 1
				},
				{
					key: 'nonce',
					type: 'NUMBER',
					required: true,
					min: 0
				},
				{
					key: 'hmac',
					type: 'STRING',
					required: true,
					pattern: /^[a-zA-Z0-9]+$/,
					min: 63,
					max: 128
				}
			]
		}
    ];

    req.body = checkForm(check, removePrototype(req.body));

	if(!validateSolution(req, req.body.pow)){
		throw Error('POW was not valid');
	}

	req.body.email = req.body.email.toLowerCase().trim();

	const data = await global.mongo.getDatabase().collection('users').findOne(
		{
			email: req.body.email
		},
		{
			projection: {
				_id: true,
				username: true,
				first_name: true,
				last_name: true,
				password: true,
				role: true
			}
		}
	);

	if(!data){
		throw new FieldError([
			{
				type: 'email',
				message: "Email doesn't exist."
			}
		]);
	}

	if(!(await bcrypt.compare(req.body.password, data.password))){
		throw new FieldError([
			{
				type: 'password',
				message: 'Password is invalid.'
			}
		]);
	}
	
	const expires = parseInt((Date.now()/1000)+(60*60*24*30).toString());
	const token = generate({
		alg: 'HS256',
		typ: 'jwt'
	},
	{
		id: data._id.toString(),
		usage: {
			type: 'ANY'
		},
		data: {
			email: req.body.email,
			username: data.username,
			first_name: data.first_name,
			last_name: data.last_name,
			role: (data.role) ? data.role : 0
		},
		exp: expires
	},
	process.env.SECRET_TOKEN+generateOTP(data.password, parseInt((expires/60).toString())));

	res.cookie('token', token, {
		maxAge: expires,
		path: '/',
		domain: '.'+process.env.DOMAIN,
		httpOnly: true,
		//secure: true
	});

	req.session.signature = token.split('.')[2];
	req.session.secret = data.password;

	return {
		message: 'Signed in!',
		link: `/`
	};
};

export const signUp = async (req, res) => {
    let check = [
        {
            key: 'email',
            type: 'EMAIL',
			required: true,
            min: 5,
            max: 64
        },
        {
            key: 'username',
            type: 'STRING',
			required: true,
			pattern: /^[a-zA-Z0-9_]+$/,
            min: 2,
            max: 64
        },
        {
            key: 'first_name',
            type: 'STRING',
			required: true,
			pattern: /^[a-zA-Z0-9]+$/,
            min: 2,
            max: 51
        },
        {
            key: 'last_name',
            type: 'STRING',
			required: true,
			pattern: /^[a-zA-Z0-9]+$/,
            min: 2,
            max: 51
        },
        {
            key: 'password',
            type: 'STRING',
			required: true,
            min: 6,
            max: 51
        },
        {
            key: 'rpassword',
            type: 'STRING',
			required: true,
            min: 6,
            max: 51
        },
        {
            key: 'pow',
            type: 'OBJECT',
            required: true,
            entries: [
				{
					key: 'challenge',
					type: 'STRING',
					required: true,
					pattern: /^[a-zA-Z0-9]+$/,
					min: 31,
					max: 64
				},
				{
					key: 'difficulty',
					type: 'NUMBER',
					required: true,
					min: 1
				},
				{
					key: 'nonce',
					type: 'NUMBER',
					required: true,
					min: 0
				},
				{
					key: 'hmac',
					type: 'STRING',
					required: true,
					pattern: /^[a-zA-Z0-9]+$/,
					min: 63,
					max: 128
				}
			]
		}
    ];

    req.body = checkForm(check, removePrototype(req.body));
	
	if(!validateSolution(req, req.body.pow)){
		throw Error('POW was not valid');
	}

	if(req.body.password != req.body.rpassword){
		throw new FieldError([
			{
				type: 'password',
				message: "Passwords don't match"
			},
			{
				type: 'rpassword',
				message: "Passwords don't match"
			}
		]);
	}

	req.body.email = req.body.email.toLowerCase().trim();

	const msession = global.mongo.getClient().startSession();

	try{
        msession.startTransaction();
	
		const id = new ObjectId();
		const password = await bcrypt.hash(req.body.password, 13);
	
		if(process.env.DB_REPLICA){
			let data = await global.mongo.getDatabase().collection('users').insertOne(
				{
					_id: id,
					email: req.body.email,
					username: req.body.username,
					first_name: req.body.first_name,
					last_name: req.body.last_name,
					password: password,
					created_at: Long.fromNumber(Date.now())
				},
				{
					msession
				}
			);
		
			if(!data.acknowledged){
				throw new Error('Failed to create account.');
			}
	
			await msession.commitTransaction();

		}else{
			let data = await global.mongo.getDatabase().collection('users').insertOne(
				{
					_id: id,
					email: req.body.email,
					username: req.body.username,
					first_name: req.body.first_name,
					last_name: req.body.last_name,
					password: password,
					created_at: Long.fromNumber(Date.now())
				}
			);
		
			if(!data.acknowledged){
				throw new Error('Failed to create account.');
			}
		}
	
		const expires = parseInt(((Date.now()/1000)+(60*60*24*30)).toString());
		const token = generate({
			alg: 'HS256',
			typ: 'jwt'
		},
		{
			id: id.toString(),
			usage: {
				type: 'ANY'
			},
			data: {
				email: req.body.email,
				username: req.body.username,
				first_name: req.body.first_name,
				last_name: req.body.last_name,
				role: 0
			},
			exp: expires
		},
		process.env.SECRET_TOKEN+generateOTP(password, parseInt((expires/60).toString())));
	
		res.cookie('token', token, {
			maxAge: expires,
			path: '/',
			domain: '.'+process.env.SECRET_TOKEN,
			httpOnly: true,
			//secure: true
		});
	
		req.session.signature = token.split('.')[2];
		req.session.secret = password;
	
		return {
			message: 'Signed up!',
			link: `/u/${req.body.username}/edit`
		};

	}catch(error){
        await msession.abortTransaction();
        throw error;

	}finally{
		msession.endSession();
	}
};

export const signOut = async (req, res) => {
	req.session.destroy((err) => {
		if(err){
			return res.status(500).json({
				status: 500,
				status_message: 'Internal Server Error'
			});
		}
		
		res.status(200).json({
			status: 403,
			status_message: 'Forbidden'
		}).cookie('token', '', { path: '/', domain: '.'+process.env.DOMAIN, maxAge: 0 })
		.cookie('profile', '', { path: '/', domain: '.'+process.env.DOMAIN, maxAge: 0 })
		.cookie('connect.sid', '', { path: '/', domain: '.'+process.env.DOMAIN, maxAge: 0 });
		
		res.end();
    });
};

export const forgotPassword = async (req, res) => {
    let check = [
        {
            key: 'email',
            type: 'EMAIL',
			required: true,
            min: 5,
            max: 64
        },
        {
            key: 'pow',
            type: 'OBJECT',
            required: true,
            entries: [
				{
					key: 'challenge',
					type: 'STRING',
					required: true,
					pattern: /^[a-zA-Z0-9]+$/,
					min: 31,
					max: 64
				},
				{
					key: 'difficulty',
					type: 'NUMBER',
					required: true,
					min: 1
				},
				{
					key: 'nonce',
					type: 'NUMBER',
					required: true,
					min: 0
				},
				{
					key: 'hmac',
					type: 'STRING',
					required: true,
					pattern: /^[a-zA-Z0-9]+$/,
					min: 63,
					max: 128
				}
			]
		}
    ];

    req.body = checkForm(check, removePrototype(req.body));
	
	if(!validateSolution(req, req.body.pow)){
		throw Error('POW was not valid');
	}

	const data = await global.mongo.getDatabase().collection('users').findOne(
		{
			email: req.body.email
		},
		{
			projection: {
				_id: true,
				first_name: true,
				last_name: true,
				password: true
			}
		}
	);

	if(!data){
		throw new FieldError([
			{
				type: 'email',
				message: "Email doesn't exist."
			}
		]);
	}

	const expires = parseInt(((Date.now()/1000)/60).toString());
	const otp = generateOTP(data.password, expires);

	return {
		message: 'Password reset email sent!',
		link: '/'
	};
};

export const resetPassword = async (req, res, id) => {
	id = ObjectId.createFromHexString(id);

    let check = [
        {
            key: 'password',
            type: 'STRING',
			required: true,
            min: 6,
            max: 51
        },
        {
            key: 'rpassword',
            type: 'STRING',
			required: true,
            min: 6,
            max: 51
        },
		{
			key: 'code',
            type: 'STRING',
            pattern: /^[a-zA-Z0-9]+$/,
            min: 5,
            max: 7
		},
		{
			key: 'expires',
			type: 'NUMBER'
		},
        {
            key: 'pow',
            type: 'OBJECT',
            required: true,
            entries: [
				{
					key: 'challenge',
					type: 'STRING',
					required: true,
					pattern: /^[a-zA-Z0-9]+$/,
					min: 31,
					max: 64
				},
				{
					key: 'difficulty',
					type: 'NUMBER',
					required: true,
					min: 1
				},
				{
					key: 'nonce',
					type: 'NUMBER',
					required: true,
					min: 0
				},
				{
					key: 'hmac',
					type: 'STRING',
					required: true,
					pattern: /^[a-zA-Z0-9]+$/,
					min: 63,
					max: 128
				}
			]
		}
    ];

    req.body = checkForm(check, removePrototype(req.body));

	if(req.body.expires+15 < parseInt(((Date.now()/1000)/60).toString())){
		throw new Error('Reset link is invalid.');
	}

	if(!validateSolution(req, req.body.pow)){
		throw Error('POW was not valid');
	}

	const data = await global.mongo.getDatabase().collection('users').findOne(
		{
			_id: id
		},
		{
			projection: {
				_id: true,
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
		throw new Error('Reset link is invalid.');
	}

	const otp = generateOTP(data.password, req.body.expires);

	if(otp != req.body.code){
		throw new Error('Reset link is invalid.');
	}

	const password = await bcrypt.hash(req.body.password, 13);

	const update = await global.mongo.getDatabase().collection('users').updateOne(
		{
			_id: id
		},
		{
			$set: {
				password: password
			}
		}
	);

	if(update.modifiedCount != 1){
		throw new Error('Unable to save to DB');
	}
	
	const expires = parseInt(((Date.now()/1000)+(60*60*24*30)).toString());
	const token = generate({
		alg: 'HS256',
		typ: 'jwt'
	},
	{
		id: id.toString(),
		usage: {
			type: 'ANY'
		},
		data: {
			email: req.body.email,
			username: data.username,
			first_name: data.first_name,
			last_name: data.last_name,
			role: (data.role) ? data.role : 0
		},
		exp: expires
	},
	process.env.SECRET_TOKEN+generateOTP(password, parseInt((expires/60).toString())));

	res.cookie('token', token, {
		maxAge: expires,
		path: '/',
		domain: '.'+process.env.DOMAIN,
		httpOnly: true,
		//secure: true
	});

	req.session.signature = token.split('.')[2];
	req.session.secret = password;

	return {
		message: 'Changes saved.',
		link: '/'
	};
};

/*
export const getAccount = async (req) => {
	const data = await global.mongo.getDatabase().collection('users').findOne(
		{
			_id: getUserID(req)
		},
		{
			projection: {
				_id: true,
				email: true,
				username: true,
				first_name: true,
				last_name: true
			}
		}
	);

	if(!data){
		throw new Error('User was not found.');
	}

	return data;
};

export const setAccount = async (req, res) => {
	const id = getUserID(req);

	const current = await global.mongo.getDatabase().collection('users').findOne(
		{
			_id: id
		},
		{
			projection: {
				_id: true,
				email: true,
				username: true,
				first_name: true,
				last_name: true,
				password: true,
				role: true
			}
		}
	);

	if(!current){
		throw new Error('User was not found.');
	}

    let check = [
        {
            key: 'email',
            type: 'EMAIL',
            min: 5,
            max: 64
        },
        {
            key: 'username',
            type: 'STRING',
			required: true,
			pattern: /^[a-zA-Z0-9_]+$/,
            min: 2,
            max: 64
        },
        {
            key: 'first_name',
            type: 'STRING',
			pattern: /^[a-zA-Z0-9]+$/,
            min: 2,
            max: 51
        },
        {
            key: 'last_name',
            type: 'STRING',
			pattern: /^[a-zA-Z0-9]+$/,
            min: 2,
            max: 51
        }
    ];

    req.body = checkForm(check, removePrototype(req.body));

    const update = {};

    for(const c of check){
        if(!req.body[c.key]){
            continue;
        }

        switch(c.type){
            case 'EMAIL':
            case 'STRING':
                if(current[c.key] != req.body[c.key]){
                    update[c.key] = req.body[c.key];
                }
                break;
        }
    }

    if(Object.keys(update).length < 1){
        throw new Error("You haven't made any changes.");
    }

	const result = await global.mongo.getDatabase().collection('users').updateOne(
		{
			_id: id
		},
		{
			$set: update
		}
	);

	if(result.modifiedCount != 1){
		throw new Error('Unable to save to DB');
	}

	const expires = parseInt((Date.now()/1000)+(60*60*24*30));
	const token = generate({
		alg: 'HS256',
		typ: 'jwt'
	},
	{
		id: id.toString(),
		usage: {
			type: 'ANY'
		},
		data: {
			email: (update.email) ? update.email : current.email,
			username: (update.username) ? update.email : current.username,
			first_name: (update.first_name) ? update.first_name : current.first_name,
			last_name: (update.last_name) ? update.last_name : current.last_name,
			role: (current.role) ? current.role : 0
		},
		exp: expires
	},
	process.env.SECRET_TOKEN+generateOTP(current.password, parseInt(expires/60)));

	res.cookie('token', token, {
		maxAge: expires,
		path: '/',
		domain: '.'+process.env.DOMAIN,
		httpOnly: true,
		//secure: true
	});

	req.session.signature = token.split('.')[2];
	req.session.secret = current.password;

    return {
        message: 'Changes saved!'
    };
};
*/

export const getUserSummary = async (req, username) => {
	let data = await global.mongo.getDatabase().collection('users').aggregate([
        {
            $match: {
                username: username
            }
        },
        {
            $project: {
                _id: true,
                username: true,
                email: true,
                first_name: true,
                last_name: true,
                avatar: true,
                created_at: true,
				role: true,
				bio: true
            }
        }
    ]).toArray();

	if(data.length < 1){
		throw new TypeError('DB found no entries...');
	}

    data = data[0];

    return data;
};

export const putUser = async (req, res) => {
    let check = [
        {
            key: 'email',
            type: 'EMAIL',
			required: true,
            min: 5,
            max: 64
        },
        {
            key: 'username',
            type: 'STRING',
			required: true,
			pattern: /^[a-zA-Z0-9_]+$/,
            min: 2,
            max: 64
        },
        {
            key: 'bio',
            type: 'STRING',
			required: true,
            min: 16,
            max: 2000
        },
        {
            key: 'pow',
            type: 'OBJECT',
            required: true,
            entries: [
				{
					key: 'challenge',
					type: 'STRING',
					required: true,
					pattern: /^[a-zA-Z0-9]+$/,
					min: 31,
					max: 64
				},
				{
					key: 'difficulty',
					type: 'NUMBER',
					required: true,
					min: 1
				},
				{
					key: 'nonce',
					type: 'NUMBER',
					required: true,
					min: 0
				},
				{
					key: 'hmac',
					type: 'STRING',
					required: true,
					pattern: /^[a-zA-Z0-9]+$/,
					min: 63,
					max: 128
				}
			]
		}
    ];

    req.body = checkForm(check, removePrototype(req.body));

	if(!validateSolution(req, req.body.pow)){
		throw Error('POW was not valid');
	}

	delete req.body.pow;

	req.body.email = req.body.email.toLowerCase().trim();

	const result = await global.mongo.getDatabase().collection('users').updateOne(
		{
			_id: getUserID(req)
		},
		{
			$set: req.body
		}
	);

	if(result.modifiedCount != 1){
		throw new Error('Unable to save to DB');
	}

	const expires = parseInt(((Date.now()/1000)+(60*60*24*30)).toString());
	const token = generate({
		alg: 'HS256',
		typ: 'jwt'
	},
	{
		id: getUserID(req),
		usage: {
			type: 'ANY'
		},
		data: {
			email: req.body.email,
			username: req.body.username,
			first_name: getFirstName(req),
			last_name: getLastName(req),
			role: getRole(req)
		},
		exp: expires
	},
	process.env.SECRET_TOKEN+generateOTP(req.session.secret, parseInt((expires/60).toString())));

	res.cookie('token', token, {
		maxAge: expires,
		path: '/',
		domain: '.'+process.env.DOMAIN,
		httpOnly: true,
		//secure: true
	});

	req.session.signature = token.split('.')[2];

	return {
		message: 'Changes saved!'
	};
};

export const getUserPosts = async (req, username) => {
	let data = await global.mongo.getDatabase().collection('users').aggregate([
        {
            $match: {
                username: username
            }
        },
        {
            $lookup: {
                from: 'threads',
                let: {
                    userId: '$_id'
                },
                pipeline: [
                    {
                        $match: {
                            $expr: {
                                $eq: ['$$userId', '$user']
                            }
                        }
                    },
					{
						$sort: {
                            created_at: -1
						}
					},
                    {
                        $skip: 0
                    },
                    {
                        $limit: 20
                    },
					{
						$lookup: {
							from: 'comments',
							let: {
								id: '$_id'
							},
							pipeline: [
								{
									$match: {
										$expr: {
											$eq: ['$$id', '$thread']
										}
									}
								},
								{
									$count: 'total'
								},
								{
									$project: {
										total: true
									}
								}
							],
							as: 'comments'
						}
					},
					{
						$project: {
                            _id: true,
                            title: true,
                            content: true,
                            pinned: true,
                            archived: true,
                            views: true,
                            categories: true,
                            created_at: true,
                            modified: true,
							comments: {
								$ifNull: [
									{ $first: '$comments.total' },
									0
								]
							}
						}
					}
                ],
                as: 'threads'
            }
        },
        {
            $project: {
                _id: true,
                username: true,
                email: true,
                first_name: true,
                last_name: true,
                avatar: true,
                created_at: true,
				role: true,
				threads: '$threads'
            }
        }
    ]).toArray();

	if(data.length < 1){
		throw new TypeError('DB found no entries...');
	}

    data = data[0];

    return data;
};
