angular.module('app').controller('contestController', function ($scope, $async, $routeParams, userService, miscService, notificationService) {
    window.mdc.autoInit()
    const drawer = mdc.drawer.MDCDrawer.attachTo(document.querySelector('.mdc-drawer'))

    $scope.toggleDrawer = () => {
        drawer.open = !drawer.open
    }
    $scope.refresh = $async(function* () {
        if (!$scope.problems)
            $scope.problems = yield userService.problemsList()

        for (let i = 0; i < $scope.problems.length; i++) {
            $scope.problems[i].solutions = yield userService.getSolutionsFor($scope.problems[i].name)
            if ($routeParams.problemName == $scope.problems[i].name)
                $scope.currentProblem = $scope.problems[i]
        }
    })
    $scope.refresh()
    let editor, editorContainer

    const fileInput = document.querySelector('input[type="file"]')
    fileInput.onchange = () => {
        if (fileInput.files.length) {
            const reader = new FileReader()
            reader.onload = () => {
                editor.setValue(reader.result)
            }
            reader.readAsText(fileInput.files[0])
        }
    }

    $scope.submit = () => {
        userService.submit($scope.currentProblem.name, editor.getValue(), $scope.currentLanguage.name /*editor.getModel().getModeId()*/).then(() => {
            $scope.refresh()
            notificationService.show('Wysłano rozwiązanie')
        }).catch((err) => {
            notificationService.show('Błąd przy wysłaniu rozwiązania')
            console.log(err)
        })
    }

    $scope.languages = []
    $scope.currentLanguage = { name: '' }

    $scope.updateMonaco = (language) => {
        monaco.editor.setModelLanguage(editor.getModel(), language.monacoName)
        editor.setValue(language.codeSnippet)

    }

    $async(function* () {
        $scope.languages = yield miscService.getLanguages()
        $scope.currentLanguage.name = $scope.languages[0].name
        yield window.monacoLoaded
        editorContainer = document.getElementById('container')
        editor = monaco.editor.create(editorContainer, {
            value: $scope.languages[0].codeSnippet,
            language: $scope.languages[0].monacoName,
            minimap: { enabled: false },
            automaticLayout: true,
            scrollBeyondLastLine: false
        })
        if (monaco.editor.getModels().length > 1) {
            editor.setModel(monaco.editor.getModels()[0])
            while (monaco.editor.getModels().length > 1)
                monaco.editor.getModels()[1].dispose()
        }

    })()

})