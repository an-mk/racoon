const { expect } = require('chai')
const User = require('../../models/User')
const Solution = require('../../models/Solution')

const sumCppGoodCode = `
    #include <iostream>
    using namespace std;
    int main() {
        int a, b;
        cin>>a>>b;
        cout<<a+b;
        return 0;
    }`

const sumCppBadCode = `
#include <iostream>
using namespace std;
int main() {
    int a, b;
    cin>>a>>b;
	cout<<a-b;
	return 0;
}`

describe('User actions:', function () {
    it('create account and logout', async function () {
        this.timeout(16000)
        this.slow(8000)
        const username = 'testUser' + Math.random().toString().substring(2, 6)
        const password = Math.random().toString().substring(2, 6)
        browser.get('http://localhost:3001')
        // Login card
        element(by.css('a[href="/login"]')).click()
        element(by.model('username')).sendKeys(username)
        element(by.model('password')).sendKeys(password)
        // Login button
        element(by.css('button[ng-click="register(username, password)"]')).click()
        // App bar
        expect(await element(by.css('section[ng-if="currentUser"] > span')).getText()).to.contain(username)
        // Login card header
        expect(await element(by.css('div[ng-show="currentUser"] > .mdc-typography--headline6')).getText()).to.contain(username)
        element(by.css('button[ng-click="logout()"]')).click()
        expect(await element(by.css('section[ng-if="!currentUser"] > span')).getText()).to.equals('Racoon')
    })
    it('create account, login and logout', async function () {
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
    it('post bad solution and check ranking', async function () {
        // expects problem to be addition
        // TODO: add problem

        this.timeout(35000)
        this.slow(25000)

        const username = 'testUser' + Math.random().toString().substring(2, 6)
        const password = Math.random().toString().substring(2, 6)

        browser.get('http://localhost:3001')
        element(by.css('a[href="/login"]')).click()
        browser.waitForAngular()
        element(by.model('username')).sendKeys(username)
        element(by.model('password')).sendKeys(password)
        element(by.css('button[ng-click="register(username, password)"]')).click()

        element(by.css('a[href="/contest"]')).click()
        element(by.css('#radio-1')).click()
        browser.executeScript(`this.monaco.editor.getModels()[0].setValue(\`${sumCppBadCode}\`)`)
        element(by.css('button[ng-click="submit()"]')).click()
        element(by.css('a[href="/ranking"]')).click()

        do {
            browser.sleep(1000)
            browser.refresh()
        } while (!await element(by.css('tr > td:first-child')).isPresent())

        expect(await element(by.css('tr > td:first-child')).getText()).to.equals(username)
        expect(await element(by.css('tr > td:last-child > span:first-child > span:first-child')).getText()).to.equals('-')
        element(by.css('a[href="/login"]')).click()
        element(by.css('button[ng-click="logout()"]')).click()
        expect(await element(by.css('section[ng-if="!currentUser"] > span')).getText()).to.equals('Racoon')
    })
    it('post good solution and check ranking', async function () {
        // expects problem to be addition
        // TODO: add problem

        this.timeout(35000)
        this.slow(25000)

        const username = 'testUser' + Math.random().toString().substring(2, 6)
        const password = Math.random().toString().substring(2, 6)

        browser.get('http://localhost:3001')
        element(by.css('a[href="/login"]')).click()
        browser.waitForAngular()
        element(by.model('username')).sendKeys(username)
        element(by.model('password')).sendKeys(password)
        element(by.css('button[ng-click="register(username, password)"]')).click()

        element(by.css('a[href="/contest"]')).click()
        element(by.css('#radio-1')).click()
        browser.executeScript(`this.monaco.editor.getModels()[0].setValue(\`${sumCppGoodCode}\`)`)
        element(by.css('button[ng-click="submit()"]')).click()
        element(by.css('a[href="/ranking"]')).click()

        do {
            browser.sleep(1000)
            browser.refresh()
        } while (!await element(by.css('tr > td:first-child')).isPresent())

        expect(await element(by.css('tr > td:first-child')).getText()).to.equals(username)
        expect(await element(by.css('tr > td:last-child > span:first-child > span:first-child')).getText()).to.equals('+')
        element(by.css('a[href="/login"]')).click()
        element(by.css('button[ng-click="logout()"]')).click()
        expect(await element(by.css('section[ng-if="!currentUser"] > span')).getText()).to.equals('Racoon')
    })
    it('post solution and check posted solutions', async function () {
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
    afterEach(async function () {
        await User.deleteMany({ elevated: { $ne: true } })
        await Solution.deleteMany({})
    })
})