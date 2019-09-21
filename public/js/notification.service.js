angular.module('app').service('notificationService', function () {
    const MDCSnackbar = mdc.snackbar.MDCSnackbar
    const snackbar = new MDCSnackbar(document.querySelector('.mdc-snackbar'))
    snackbar.timeoutMs = 4000
    this.show = async function (str) {
        snackbar.close()
        snackbar.labelText = str
        console.log(str);
        snackbar.open()
    }
})