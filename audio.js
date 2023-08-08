//INDIQUE OS IDS DO BOTÃO DE GRAVAR E A ÁREA ONDE O AUDIO SERÁ ADICIONADO
var microphoneBtn = document.getElementById('btnGravar');
var audioContainer = document.getElementById('area-audio');

//CAMINHO PARA UPLOAD DOS AUDIOS
var serverUrl = 'http://IP_OU_URL_SERVIDOR/audio_upload.php?key=[SUA_KEY_AQUI]';

//QUER QUE SALVE AS URLS DOS AUDIOS NO LOCALSTORAGE?
var saveLocal = true; //true (sim) false (não)

/**** NÃO MEXER DAQUI PARA BAIXO ****
 * 
*/
//CASO SAVELOCAL ATIVO
//PUXAR OS AUDIOS E ALIMENTAR O APP CASO TENHA REGISTROS LOCAIS
if (saveLocal) {
    if (localStorage.getItem('audioData')) {
        //RECUPERAR OS DADOS
        const audioArrayJSON = localStorage.getItem('audioData');

        //CONVERTENDO PARA OBJETOS
        const audioArray = JSON.parse(audioArrayJSON);

        // Para cada objeto no array, chama a função para criar o player de áudio
        audioArray.forEach(audioObj => {
            createAudioPlayer(audioObj.audio_src);
        });
    }
}

//VARIAVEIS GERAIS
var isRecording = false;
var startTime;
var audioChunks = [];
var mediaStream;
var mediaRec;
var audioFile;
var hashAleatoria;

//EVENTOS DE SEGURAR O BOTÃO
microphoneBtn.addEventListener('mousedown', startRecording);
microphoneBtn.addEventListener('touchstart', startRecording);
microphoneBtn.addEventListener('mouseup', stopRecording);
microphoneBtn.addEventListener('touchend', stopRecording);

function startRecording() {
    //MARCAÇÃO DE QUE ESTÁ GRAVANDO
    isRecording = true;
    startTime = Date.now();
    audioChunks = [];

    //ADICIONAR COR VERDE PARA SABER QUE ESTÁ GRAVANDO
    microphoneBtn.classList.add('color-green');

    //OPÇÕES DE QUALIDADE PLUGIN
    var options = {
        limit: 1, // Limite de gravação (1 arquivo)
        quality: 2 // Qualidade de gravação: 0 (baixa) a 2 (alta)
    };

    // Cria a pasta personalizada para os áudios
    createAudioFolder();
}

//CRIAR PASTA PARA GUARDAR ARQUIVO LOCAL
function createAudioFolder() {
    // Verifica se a pasta já existe
    window.resolveLocalFileSystemURL(cordova.file.dataDirectory, function (dirEntry) {
        dirEntry.getDirectory('audio_recordings', { create: true, exclusive: false }, function (subDirEntry) {
            console.log('Pasta "audio_recordings" criada com sucesso.');
            startMediaRecording(subDirEntry);
        }, function (error) {
            console.error("Erro ao criar a pasta 'audio_recordings': " + error);
        });
    }, function (error) {
        console.error("Erro ao acessar o diretório de armazenamento: " + error);
    });
}

function startMediaRecording(directoryEntry) {
    navigator.mediaDevices.getUserMedia({ audio: true })
        .then(function (stream) {
            mediaStream = stream;
            mediaRec = new MediaRecorder(mediaStream);

            var chunks = [];
            mediaRec.ondataavailable = function (e) {
                chunks.push(e.data);
            };

            mediaRec.onstop = function () {
                //console.log('Chegou até aqui');
                var blob = new Blob(chunks, { type: 'audio/wav' });
                var fileName = new Date().getTime() + ".wav";
                audioFile = directoryEntry.nativeURL + fileName;

                // Salva o arquivo na pasta personalizada
                directoryEntry.getFile(fileName, { create: true, exclusive: false }, function (fileEntry) {
                    fileEntry.createWriter(function (fileWriter) {
                        fileWriter.write(blob);
                    }, function (error) {
                        console.error("Erro ao criar o escritor do arquivo: " + error);
                    });
                }, function (error) {
                    console.error("Erro ao obter o arquivo: " + error);
                });

            };

            mediaRec.start();

        })
        .catch(function (err) {
            console.error("Erro ao iniciar a gravação: " + err.message);
        });
}

function stopRecording() {
    isRecording = false;
    microphoneBtn.classList.remove('color-green');

    if (mediaRec && mediaStream) {
        mediaRec.stop();
        mediaStream.getTracks().forEach(track => track.stop());
    }

    app.dialog.preloader('Enviando...')

    setTimeout(() => {
        uploadRecording()
    }, 1000);

}

function uploadRecording() {
    console.log(audioFile);
    if (audioFile) {
        // Obtém o arquivo gravado em um Blob
        window.resolveLocalFileSystemURL(audioFile, function (fileEntry) {
            fileEntry.file(function (file) {
                var reader = new FileReader();
                reader.onloadend = function () {
                    var audioBlob = new Blob([new Uint8Array(this.result)], { type: 'audio/wav' });
                    var newName = generateRandomHash()
                    // Cria um objeto FormData e adiciona o arquivo de áudio a ser enviado
                    var formData = new FormData();
                    formData.append('file', audioBlob, newName + '.wav');

                    // Opções da requisição Fetch
                    var fetchOptions = {
                        method: 'POST',
                        body: formData
                    };

                    fetch(serverUrl, fetchOptions)
                        .then(function (response) {
                            if (response.ok) {
                                return response.text();
                            } else {
                                app.dialog.alert('Falha ao fazer Upload.');
                                app.dialog.close();
                                throw new Error('Erro na resposta do servidor: ' + response.status);

                            }
                        })
                        .then(function (responseData) {
                            console.log('Arquivo enviado com sucesso: ' + responseData);
                            app.dialog.close();
                            createAudioPlayer(responseData);
                            //SE SALVAR LOCAL ESTIVER ATIVO
                            if (saveLocal) {
                                addToLocalStorage(responseData);
                            }
                        })
                        .catch(function (error) {
                            app.dialog.close();
                            console.error('Erro no envio do arquivo: ' + error.message);
                            app.dialog.alert('Falha ao fazer Upload: ' + error.message);
                        });
                };
                reader.readAsArrayBuffer(file);
            }, function (error) {
                app.dialog.close();
                app.dialog.alert("Erro ao ler o arquivo: " + error);
                console.error("Erro ao ler o arquivo: " + error);
            });
        }, function (error) {
            app.dialog.close();
            app.dialog.alert("Erro ao acessar o arquivo: " + error);
            console.error("Erro ao acessar o arquivo: " + error);
        });
    } else {
        app.dialog.close();
        app.dialog.alert("Nenhum arquivo de áudio gravado para enviar.");
        console.error("Nenhum arquivo de áudio gravado para enviar.");
    }
}

function createAudioPlayer(audioUrl) {
    var audioPlayer = document.createElement('audio');
    audioPlayer.src = audioUrl;
    audioPlayer.controls = true;
    audioPlayer.controlsList = 'nodownload norotate';
    audioPlayer.style.marginTop = '10px';
    audioPlayer.classList.add('custom-audio');

    audioContainer.appendChild(audioPlayer);
}

function generateRandomHash() {
    const characters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let hash = '';

    // Incluindo Date.now() no início da hash para adicionar aleatoriedade
    hash += Date.now().toString();

    // Adicionando 7 caracteres aleatórios após o Date.now()
    for (let i = 0; i < 7; i++) {
        const randomIndex = Math.floor(Math.random() * characters.length);
        hash += characters[randomIndex];
    }

    return hash;
}

function addToLocalStorage(audioURL) {
    // Verifica se o localStorage existe
    if (localStorage.getItem('audioData')) {
        // Recupera o array existente do localStorage ou cria um novo array vazio
        const audioArrayJSON = localStorage.getItem('audioData');
        let audioArray = [];

        if (audioArrayJSON) {
            audioArray = JSON.parse(audioArrayJSON);
        }

        // Adiciona a nova URL ao array
        audioArray.push({ audio_src: audioURL });

        // Converte o array de objetos em uma string JSON
        const updatedAudioArrayJSON = JSON.stringify(audioArray);

        // Armazena o array atualizado no localStorage
        localStorage.setItem('audioData', updatedAudioArrayJSON);

        console.log('URL de áudio adicionada ao localStorage:', audioURL);
    } else {
        //PRIMEIRA VEZ QUE CRIA LOCALSTORAGE
        let audioArray = [];
        audioArray.push({ audio_src: audioURL });

        // Armazena o array atualizado no localStorage
        localStorage.setItem('audioData', JSON.stringify(audioArray));

    }
}