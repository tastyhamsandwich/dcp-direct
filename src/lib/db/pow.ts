import 'crypto';

const MAX_POW_PER_SESSION = 15;
const { createHmac, randomBytes, createHash } = await import("node:crypto");

export const generateChallenge = (req, difficulty = 4) => {
    if(req.session.challenges && req.session.challenges.length > MAX_POW_PER_SESSION){
        req.session.challenges.splice(req.session.challenges.indexOf(req.session.challenges.length-1, 1));
    }

    const challenge = randomBytes(16).toString('hex');
    const hmac = createHmac('sha256', process.env.POW_TOKEN!).update(challenge+difficulty).digest('hex');

    if(req.session.challenges){
        req.session.challenges.push(hmac);
        return {
            challenge,
            hmac,
            difficulty
        };
    }

    req.session.challenges = [
        hmac
    ];
    return {
        challenge,
        hmac,
        difficulty
    };
};

export const validateSolution = (req, pow) => {
    if(!req.session.challenges){
        return false;
    }

    try{
        req.session.challenges.splice(req.session.challenges.indexOf(pow.hmac), 1);

    }catch(error){
        return false;
    }

    if(createHmac('sha256', process.env.POW_TOKEN!).update(pow.challenge+pow.difficulty).digest('hex') != pow.hmac){
        return false;
    }

    const hash = createHash('sha256').update(pow.challenge+pow.nonce).digest('hex');
    return hash.startsWith('0'.repeat(pow.difficulty));
};
