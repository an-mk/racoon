const { createModel } = require('mongoose-gridfs');
const mongoose = require('mongoose');
const db = require('../db')
const fs = require('fs')

var File = undefined
async function getFile() {
    if (File === undefined) {
        create = async function () {
            File = createModel({
                modelName: 'File'
            })
        }
        if (db.connection.readyState == 1)
            create()
        else {
            mongoose.connection.on('connected', create);
        }
    }
    return File
}

async function write(filename, fileStream) {
    await getFile()
    await new Promise(resolve => setTimeout(resolve, 2000));
    return await new Promise((resolve, reject) => {
        File.write({ filename: filename, contentType: 'text/plain' }, fileStream, async (error, file) => {
            if(error) {
                reject(error)
            }
            else 
                resolve(file)
        })
    })
}

async function getStream(fileId) {
    await getFile()
    return await File.read({ _id: fileId })
}

async function toFile(fileId, path) {
    const writeStream = fs.createWriteStream(path)
    const readStream = await getStream(fileId)
    await new Promise(resolve => {
        writeStream.on('finish', resolve)
        readStream.pipe(writeStream)
    })
}

async function unlink(fileId) {
    await getFile()
    await File.unlink({ fileId }, (err) => {
        throw err
    })
}

module.exports = { write, getStream, toFile, unlink, getFile }