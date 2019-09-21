const { expect } = require('chai')
const User = require('../../models/User')
const Solution = require('../../models/Solution')

describe('User actions', function () {
    it('Create account', async function () {
        this.timeout(6000)
        const username = 'Abc xyz ' + Math.random().toString().substring(2)
        const password = '12345678' + Math.random().toString().substring(2)

        browser.get('http://localhost:3001')
        element(by.css('a[href="/login"]')).click()
        element(by.model('username')).sendKeys(username)
        element(by.model('password')).sendKeys(password)
        element(by.css('button[ng-click="register(username, password)"]')).click()
        expect(await element(by.css('section[ng-if="currentUser"] > span')).getText()).to.contain(username)
        expect(await element(by.css('div[ng-if="currentUser"] > .mdc-typography--headline6')).getText()).to.contain(username)
        element(by.css('button[ng-click="logout()"]')).click()
        expect(await element(by.css('section[ng-if="!currentUser"] > span')).getText()).to.equals('Racoon')
    })
    it('Login and logout', async function () {
        this.timeout(6000)
        const username = 'Abc xyz ' + Math.random().toString().substring(2)
        const password = '12345678' + Math.random().toString().substring(2)

        browser.get('http://localhost:3001')
        element(by.css('a[href="/login"]')).click()
        element(by.model('username')).sendKeys(username)
        element(by.model('password')).sendKeys(password)
        element(by.css('button[ng-click="register(username, password)"]')).click()
        expect(await element(by.css('section[ng-if="currentUser"] > span')).getText()).to.contain(username)
        element(by.css('button[ng-click="logout()"]')).click()
        expect(await element(by.css('section[ng-if="!currentUser"] > span')).getText()).to.equals('Racoon')
        element(by.css('a[href="/contest"]')).click()
        element(by.css('a[href="/login"]')).click()
        element(by.model('username')).sendKeys(username)
        element(by.model('password')).sendKeys(password)
        element(by.css('button[action="submit"]')).click()
        expect(await element(by.css('section[ng-if="currentUser"] > span')).getText()).to.contain(username)
        element(by.css('button[ng-click="logout()"]')).click()
        expect(await element(by.css('section[ng-if="!currentUser"] > span')).getText()).to.equals('Racoon')
    })
    it('Post solution', async function () {
        this.timeout(6000)
        const username = 'Abc xyz ' + Math.random().toString().substring(2)
        const password = '12345678' + Math.random().toString().substring(2)
        const code = 'float xyz = ' + Math.random().toString().substring(2)

        browser.get('http://localhost:3001')
        element(by.css('a[href="/login"]')).click()
        element(by.model('username')).sendKeys(username)
        element(by.model('password')).sendKeys(password)
        element(by.css('button[ng-click="register(username, password)"]')).click()
        element(by.css('a[href="/contest"]')).click()
        element(by.css('#radio-1')).click()
        browser.executeScript(`this.monaco.editor.getModels()[0].setValue('${code}')`)
        element(by.css('button[ng-click="submit()"]')).click()
        element(by.css('button[ng-show="currentUser"]')).click()
        expect(await element(by.css('code')).getText()).to.equals(code)
    })
    it('Ranking', async function () {
        // TOO SLOW :'C
        this.timeout(20000)
        const username = 'Abc xyz ' + Math.random().toString().substring(2)
        const password = '12345678' + Math.random().toString().substring(2)
        const code = 'int xyz = ' + Math.random().toString().substring(2)

        browser.get('http://localhost:3001')
        element(by.css('a[href="/login"]')).click()
        element(by.model('username')).sendKeys(username)
        element(by.model('password')).sendKeys(password)
        element(by.css('button[ng-click="register(username, password)"]')).click()
        element(by.css('a[href="/contest"]')).click()
        element(by.css('#radio-1')).click()
        browser.executeScript(`this.monaco.editor.getModels()[0].setValue('${code}')`)
        element(by.css('button[ng-click="submit()"]')).click()
        element(by.css('a[href="/ranking"]')).click()
        //Time for checking solution
        await new Promise(r => setTimeout(r, 16000))
        browser.refresh()
        await new Promise(r => setTimeout(r, 2000))
        expect(await element(by.css('tr > td')).getText()).to.equals(username)
    })
    afterEach(async function () {
        await User.deleteMany({ elevated: { $ne: true } })
        await Solution.deleteMany({})
    })
})