<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST');

//CHAVE DE SEGURANÇA
//invente uma chave de segurança aqui
$chaveServer = '2dyp6WawyXz8L10PibManN2pNtZsJ9hL85jczuJm'; 

//CONFIGURAÇÕES BANCO
// $servidor = 'localhost';
// $usuario = 'root';
// $senha = '';
// $banco = 'nome_do_banco';

 
//CONEXÃO COM BANCO DE DADOS (descomente se precisar conectar com banco)
// $conexao = mysqli_connect('localhost', $usuario,$senha);
// $banco = mysqli_select_db($conexao,$banco);
// mysqli_set_charset($conexao,'utf8mb4');


// Verifica se a chave de segurança foi fornecida pelo cliente
if (empty($_GET['key']) || $_GET['key'] !== $chaveServer) {
    http_response_code(403); // Retorna um código de resposta 403 - Acesso Negado
    die('Erro: Acesso não autorizado!');
}

/*** VALIDAÇÕES DA IMAGEM ***/

// Verifica se o arquivo foi enviado corretamente
if ($_FILES['file']['error'] !== UPLOAD_ERR_OK) {
    die('Erro: falha ao enviar arquivo.');
}

// Lista de tipos de arquivo permitidos
$tiposAceitos = array('audio/wav');

// Verifica se o arquivo é uma imagem JPG
if (!in_array($_FILES['file']['type'], $tiposAceitos)) {
    die('Apenas audio do tipo Wav são permitidos.');
}

// Pasta para onde os arquivos serão enviados
$uploadDir = 'audios/';
$nome_aleatorio = md5(uniqid(time())).'.wav';

// Move o arquivo para a pasta de destino
$destination = $uploadDir . $nome_aleatorio;

if (move_uploaded_file($_FILES['file']['tmp_name'], $destination)) {
    // Retorna a URL completa do caminho da imagem no servidor
    $serverURL = 'http://' . $_SERVER['HTTP_HOST'] . dirname($_SERVER['PHP_SELF']);
    $audioURL = $serverURL . '/' . $destination;
				
				//SALVAR NO BANCO DE DADOS REMOTO O CAMINHO DA IMAGEM 
				//(descomente se precisar usar)	
				/*
				
				$inserir="INSERT INTO audios (url_audio) values ('$audioURL')";
				$query = mysqli_query($conexao,$inserir) or die(mysqli_error());	

				//VERIFICA SE EXECUTOU A FUNÇÃO INSERIR
				if ($query == true) {
					echo $audioURL; //RETORNA O CAMINHO DA IMAGEM PRO APP
				}else{
					http_response_code(500); // Retorna um código de resposta 500 - Internal Server Error
					die('Erro: Falha ao inserir no banco de dados!');
				}				
				*/
	
				echo $audioURL; //comente essa linha se for salvar no banco de dados
} else {
    die('Erro: Falha ao mover arquivo para o servidor.');
}




?>