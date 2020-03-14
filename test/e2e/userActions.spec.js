const { expect } = require('chai')
const User = require('../../models/User')
const Solution = require('../../models/Solution')

const sumCppCode = `
#include <iostream>
using namespace std;
int main() {
    int a, b;
    cin>>a>>b;
	cout<<a+b;
	return 0;
}`

describe('User actions', function () {
    it('Create account', async function () {
        this.timeout(16000)
        this.slow(8000)
        const username = 'testUser' + Math.random().toString().substring(2, 6)
        const password = Math.random().toString().substring(2, 6)

        browser.get('http://localhost:3001')
        element(by.css('a[href="/login"]')).click()
        element(by.model('username')).sendKeys(username)
        element(by.model('password')).sendKeys(password)
        element(by.css('button[ng-click="register(username, password)"]')).click()
        expect(await element(by.css('section[ng-if="currentUser"] > span')).getText()).to.contain(username)
        expect(await element(by.css('div[ng-show="currentUser"] > .mdc-typography--headline6')).getText()).to.contain(username)
        element(by.css('button[ng-click="logout()"]')).click()
        expect(await element(by.css('section[ng-if="!currentUser"] > span')).getText()).to.equals('Racoon')
    })
    it('Login and logout', async function () {
        this.timeout(16000)
        this.slow(8000)
        const username = 'testUser' + Math.random().toString().substring(2, 6)
        const password = Math.random().toString().substring(2, 6)

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
        this.timeout(16000)
        this.slow(8000)
        const username = 'testUser' + Math.random().toString().substring(2, 6)
        const password = Math.random().toString().substring(2, 6)
        const code = 'float pi = 3.14;'

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
        element(by.css('a[href="/login"]')).click()
        element(by.css('button[ng-click="logout()"]')).click()
        expect(await element(by.css('section[ng-if="!currentUser"] > span')).getText()).to.equals('Racoon')
    })
    it('Server checking delay', async function () {
        // Time for checking solution
        this.timeout(40000)
        this.slow(40000)
        browser.sleep(20000)
    })
    it('Ranking', async function () {
        // TODO: expects problem to be addition
        this.timeout(30000)
        this.slow(25000)

        const username = 'testUser' + Math.random().toString().substring(2, 6)
        const password = Math.random().toString().substring(2, 6)

        browser.get('http://localhost:3001')
        element(by.css('a[href="/login"]')).click()
        element(by.model('username')).sendKeys(username)
        element(by.model('password')).sendKeys(password)
        element(by.css('button[ng-click="register(username, password)"]')).click()
        element(by.css('a[href="/contest"]')).click()
        element(by.css('#radio-1')).click()
        browser.executeScript(`this.monaco.editor.getModels()[0].setValue(\`${sumCppCode}\`)`)
        element(by.css('button[ng-click="submit()"]')).click()
        element(by.css('a[href="/ranking"]')).click()
        // Time for checking solution
        browser.sleep(15000)
        browser.refresh()
        browser.waitForAngular()
        expect(await element(by.css('tr > td:first-child')).getText()).to.equals(username)
        expect(await element(by.css('tr > td:last-child > span:first-child > span:first-child')).getText()).to.equals('+')

    })
    afterEach(async function () {
        await User.deleteMany({ elevated: { $ne: true } })
        await Solution.deleteMany({})
    })
})