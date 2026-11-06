
### `Jenkinsfile`

```groovy
pipeline {
    agent any
    environment { CI = 'true' }
    stages {
        stage('Checkout') { steps { checkout scm } }
        stage('Install')  { steps { sh 'npm ci' } }
        stage('Test')     { steps { sh 'npm test' } }
        stage('Package')  { steps { sh 'npm pack --dry-run' } }
    }
    post {
        always { cleanWs() }
    }
    stage('Install') {
        steps {
            sh 'npm ci --prefer-offline --no-audit'
        }
    }
        stage('Package') {
        steps { sh 'npm pack --dry-run' }
    }
}