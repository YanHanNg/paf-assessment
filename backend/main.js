// Accquire all the Environment Variables from .env
require('dotenv').config();

const morgan = require('morgan')
const express = require('express')
const mysql = require('mysql2/promise')
const sha1 = require('sha1');
const multer = require('multer');
const fs = require('fs');
const AWS = require('aws-sdk');
const { MongoClient } = require('mongodb');
const { EILSEQ } = require('constants');

const PORT = parseInt(process.argv[2]) || parseInt(process.env.PORT) || 3000

const app = express()

app.use(morgan('combined'))

// Create Mongo Client Pool
const MONGO_URL = 'mongodb://localhost:27017';
const mongoClient = new MongoClient(MONGO_URL, {
    useNewUrlParser: true, useUnifiedTopology: true
})

const M_DATABASE_NAME = 'paf2020';
const M_COLLECTION_NAME = 'something';

//AWS
const AWS_S3_HOST_NAME = process.env.AWS_S3_HOST_NAME;
const AWS_S3_BUCKETNAME = process.env.AWS_S3_BUCKETNAME;
const spaceEndPoint = new AWS.Endpoint(AWS_S3_HOST_NAME);
const s3 = new AWS.S3({
    endpoint: spaceEndPoint,
    accessKeyId: process.env.AWS_S3_ACCESS_KEY,
    secretAccessKey: process.env.AWS_S3_SECRET_ACCESS_KEY
})

// Create the Mysql Database Connection Pool  
const pool = mysql.createPool({   
    host: process.env.MYSQL_SERVER || 'localhost',   
    port: parseInt(process.env.MYSQL_SVR_PORT) || 3306,   
    database: process.env.MYSQL_SCHEMA || 'paf2020',   
    user: process.env.MYSQL_USERNAME,
    password: process.env.MYSQL_PASSWORD,  
    connectionLimit: parseInt(process.env.MYSQL_CONN_LIMIT) || 4,   
    timezone: process.env.DB_TIMEZONE || '+08:00'   
})

//Make a Closure, Take in SQLStatement and ConnPool  
const makeQuery = (sql, pool) => {  
    return (async (args) => {  
        const conn = await pool.getConnection();  
        try {  
            let results = await conn.query(sql, args || []);  
            //Only need first array as it contains the query results.  
            //index 0 => data, index 1 => metadata  
            return results[0];  
        }  
        catch(err) {  
            console.error('Error Occurred during Query', err);  
        }  
        finally{  
            conn.release();  
        }  
    })  
}  

//SQL to Authenticate
const SQL_AUTHENTICATE = "SELECT Count(*) as count from user where user_id = ? and password = ?"
const authenticateMySQL = makeQuery(SQL_AUTHENTICATE, pool);

//Resources
// POST /authenticate
app.post('/authenticate', express.json(), (req, res) => {
	
	const user_id = req.body['user_id'];
	const passwordSha1 = sha1(req.body['password']);

	authenticateMySQL([user_id, passwordSha1])
		.then(data => {

            // Get Count if count > 1 means the user is a valid user
			count = parseInt(data[0].count);

			if(count == 0)
				res.status(401).type('application/json').json({msg: 'Invalid Credentials'});
			else
				res.status(200).type('application/json').json({msg: 'Authenticated'});
		});
})

// Upload to Temporary directory
// create an upload using multer to upload the file to tmp dir 
const upload = multer({ 
    dest: process.env.TMP_DIR || './tmp/' 
})

const s3PutObject = (file, buff, s3) => new Promise ( (resolve, reject) =>{
    const params = {
        Bucket: AWS_S3_BUCKETNAME,
        Key: file.filename,
        Body: buff,
        ACL: 'public-read',
        ContentType: file.mimetype,
        ContentLength: file.size
    }

    s3.upload(params, (err, data) => {
        if(err)
            reject(err);
        else
            resolve(data);
    })
})

const readFile = (file) => new Promise( (resolve, reject) => {
    fs.readFile(file, (err, image) => {
        if(null != err)
            reject(err);
        else
            resolve(image);
    })    
})  

// Mongo Doc
const mkMongoSomthingDoc = (body, key) => { 
    return {
        title: body.title,
        comments: body.comments,
        s3refKey: key,
        timestamp: new Date()
    }
}

//Handle Post data
app.post('/shareSomthing', upload.single('image-file'), (req, res) => {
    //console.info('res body>>>>>>> ', req.body);
    //console.info('res file>>>>>>> ', req.file);

    const user_id = req.body['user_id'];
	const passwordSha1 = sha1(req.body['password']);

    authenticateMySQL([user_id, passwordSha1])
		.then(data => {

            // Get Count if count > 1 means the user is a valid user
			count = parseInt(data[0].count);

            if(count == 0)
                //res.status(401).type('application/json').json({msg: 'Invalid Credentials'});
                throw new Error('401');
			else
				return data;
        })
        .then(data => {
            // Read file from Temporary
            return readFile(req.file.path)
                .then(buff => buff)
        })
        .then(buff => s3PutObject(req.file, buff, s3))
        .then(result => {
            const doc = mkMongoSomthingDoc(req.body, result.key);

            // Insert Into MongoDB
            return mongoClient.db(M_DATABASE_NAME)
                .collection(M_COLLECTION_NAME)
                .insertOne(doc);
        })
        .then(results => {
            res.on('finish', () => {
                //delete the tmp file
                fs.unlink(req.file.path, () => {})
            })
            console.info('Inserted Doc Id: ', results.insertedId);
            res.status(200).type('application/json').json({ insertedDocId: results.insertedId })
        })
        .catch(err => {
            console.error('Error occurred: ', err);
            if(err.message === '401')
                res.status(401).type('application/json').json({msg: 'Invalid Credentials'});
            else
                res.status(500).type('application/json').json({error: err})
        })
})

const pMysql = new Promise( (resolve, reject) => {
    pool.getConnection()
        .then(conn => {
            const param1 = Promise.resolve(conn);
            const param2 = conn.ping();
            return Promise.all([param1, param2]);
        })
        .then(results => {
            const conn = results[0];
            //Resolve Promise
            resolve();
            //Release Connection
            conn.release();
        })
        .catch(err => {
            console.info('Error during SQL Connection Ping: ', err);
            reject();
        })
})

// Startup MongoClient
const pMongo = mongoClient.connect();

const pAWSKey = new Promise( (resolve, reject) => {
    if( (!!process.env.AWS_S3_ACCESS_KEY) && (!!process.env.AWS_S3_SECRET_ACCESS_KEY) )
        resolve();
    else
        reject();
})

Promise.all([pMysql, pMongo, pAWSKey])
    .then(result => {
        app.listen(PORT, () => {
            console.info(`Application started on port ${PORT} at ${new Date()}`)
        })
    })

