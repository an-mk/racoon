const { createModel } = require('mongoose-gridfs');
const db = require('../db')
const fs = require('fs')

var File = undefined
async function getFile() {
    if (File === undefined) {
        if (db.connection.readyState != 1) {
            await new Promise((resolve) => {
                db.connection.on('connected', resolve)
            })
        }
        File = await createModel({
            modelName: 'File'
        })
    }
    return File
}

async function write(filename, fileStream) {
    await getFile()
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