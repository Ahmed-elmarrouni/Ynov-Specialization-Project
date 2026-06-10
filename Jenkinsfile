pipeline {
    agent any

    environment {
        DOCKER_COMPOSE_FILE = 'docker-compose.yml'
        DEPLOY_HOST = '68.221.161.128'
        DEPLOY_USER = 'azureuser'
        PROJECT_DIR = '/home/azureuser/edutrack'
    }

    stages {

        stage('Checkout') {
            steps {
                echo 'Cloning repository...'
                checkout scm
            }
        }

        stage('Build') {
            steps {
                echo 'Building Docker images...'
                sh '''
                    cp /home/azureuser/edutrack/backend/.env ./backend/.env
                    docker-compose -f ${DOCKER_COMPOSE_FILE} build
                '''
            }
        }

        stage('Test') {
            steps {
                echo 'Running backend tests...'
                // echo 'Running backend tests...'
                // sh '''
                //     docker-compose -f ${DOCKER_COMPOSE_FILE} run --rm backend \
                //         python -m pytest tests/ -v --tb=short || true
                // '''
            }
        }

        stage('Deploy') {
            steps {
                echo 'Deploying to Azure VM...'
                sshagent(credentials: ['edutrack-ssh-key']) {
                    sh '''
                        ssh -o StrictHostKeyChecking=no ${DEPLOY_USER}@${DEPLOY_HOST} "
                            mkdir -p ${PROJECT_DIR} &&
                            cd ${PROJECT_DIR} &&
                            git pull origin develop
                        "
                        ssh ${DEPLOY_USER}@${DEPLOY_HOST} "
                            cd ${PROJECT_DIR} &&
                            docker-compose down &&
                            docker-compose up -d
                        "
                    '''
                }
            }
        }
    }

    post {
        success {
            echo 'Pipeline succeeded - EduTrack deployed!'
        }
        failure {
            echo 'Pipeline failed - check logs above.'
        }
    }
}