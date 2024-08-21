const express = require("express");
const cors = require("cors");
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const server = express();

server.use(cors());
server.use(express.json());

const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data.json');

server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

// Carregando o arquivo de dados
let data = require(DATA_FILE);

// Função para salvar os dados no arquivo
function salvarDados(dados) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(dados, null, 2));
}

// Função para salvar o histórico com nome e descrição do item apenas para ações de "add"
function salvarHistorico(itemId) {
    const item = data.items.find(item => item.id === itemId);

    // Procura um item no histórico para atualizar
    const historicoIndex = data.historico.findIndex(historico => historico.itemId === itemId);

    if (historicoIndex >= 0) {
        // Atualiza o histórico existente com as novas informações
        data.historico[historicoIndex] = {
            ...data.historico[historicoIndex],
            users: item.users,
            data: item.data
        };
    } else {
        // Adiciona um novo histórico se não existir um para o itemId
        const historicoItem = {
            id: uuidv4(),
            itemId,
            name: item.name,
            descricao: item.descricao,
            data: item.data,
            users: item.users
        };
        data.historico.push(historicoItem);
    }

    salvarDados(data);
}




// Rota GET para buscar os itens
server.get('/', (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const itemsPerPage = parseInt(req.query.itemsPerPage) || 20;
    const search = req.query.search || "";

    const startIndex = (page - 1) * itemsPerPage;
    const endIndex = page * itemsPerPage;

    const filteredData = data.items.filter(item =>
        item.name.toLowerCase().includes(search.toLowerCase())
    );

    if (filteredData.length === 0) {
        return res.status(404).json({ message: "No data found" });
    }

    const paginatedData = filteredData.slice(startIndex, endIndex);

    res.json({
        totalItems: filteredData.length,
        totalPages: Math.ceil(filteredData.length / itemsPerPage),
        currentPage: page,
        itemsPerPage: itemsPerPage,
        items: paginatedData
    });
});

// Rota POST para adicionar um novo item
server.post('/add', (req, res) => {
    try {
        const novaRefeicao = req.body;
        const currentDate = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

        // Validação
        if (!novaRefeicao.name || !novaRefeicao.descricao) {
            return res.status(400).json({ message: "Name and description are required" });
        }

        // Gera um novo UUID para o novo item
        novaRefeicao.id = uuidv4();

        // Atribui a data atual ao novo item
        novaRefeicao.data = currentDate;

        // Adiciona o novo item ao array de dados
        data.items.push(novaRefeicao);

        // Salva os dados no arquivo
        salvarDados(data);

        // Salva no histórico
        salvarHistorico(novaRefeicao.id);

        // Retorna resposta de sucesso
        res.status(201).json({ message: "Item added successfully", newItem: novaRefeicao });
    } catch (error) {
        console.error("Erro ao salvar os dados: ", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

// Rota DELETE para apagar um item
server.delete('/delete/:id', (req, res) => {
    try {
        const { id } = req.params;

        // Remove o item com o ID especificado
        const itemIndex = data.items.findIndex(item => item.id === id);
        if (itemIndex === -1) {
            return res.status(404).json({ message: "Item not found" });
        }

       
        data.items.splice(itemIndex, 1);

        // Salva os dados atualizados no arquivo
        salvarDados(data);

        // Retorna resposta de sucesso
        res.status(200).json({ message: "Item deleted successfully" });
    } catch (error) {
        console.error("Erro ao deletar os dados: ", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

server.patch('/increment/:id', (req, res) => {
    try {
        const { id } = req.params;

        const item = data.items.find(item => item.id === id);
        if (!item) {
            return res.status(404).json({ message: "Item not found" });
        }

        // Atualiza o número de usuários
        item.users += 1;

        // Salva os dados atualizados no arquivo
        salvarDados(data);

        // Salva o histórico com os dados atualizados
        salvarHistorico(id);

        res.status(200).json({ message: "User count incremented successfully" });
    } catch (error) {
        console.error("Erro ao incrementar usuários: ", error);
        res.status(500).json({ message: "Internal server error" });
    }
});


server.patch('/decrement/:id', (req, res) => {
    try {
        const { id } = req.params;

        const item = data.items.find(item => item.id === id);
        if (!item) {
            return res.status(404).json({ message: "Item not found" });
        }

        // Atualiza o número de usuários
        item.users = Math.max(item.users - 1, 0);

        // Salva os dados atualizados no arquivo
        salvarDados(data);

        // Salva o histórico com os dados atualizados
        salvarHistorico(id);

        res.status(200).json({ message: "User count decremented successfully" });
    } catch (error) {
        console.error("Erro ao decrementar usuários: ", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

// Rota DELETE para apagar um item específico do histórico
server.delete('/historico/delete/:id', (req, res) => {
    try {
        const { id } = req.params;

        // Remove o item do histórico com o ID especificado
        const historicoIndex = data.historico.findIndex(historico => historico.id === id);
        if (historicoIndex === -1) {
            return res.status(404).json({ message: "Historical item not found" });
        }

        data.historico.splice(historicoIndex, 1);

        // Salva os dados atualizados no arquivo
        salvarDados(data);

        // Retorna resposta de sucesso
        res.status(200).json({ message: "Historical item deleted successfully" });
    } catch (error) {
        console.error("Erro ao deletar o item do histórico: ", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

// Rota DELETE para apagar todos os itens do histórico
server.delete('/historico/delete-all', (req, res) => {
    try {
        // Limpa o array de histórico
        data.historico = [];

        // Salva os dados atualizados no arquivo
        salvarDados(data);

        // Retorna resposta de sucesso
        res.status(200).json({ message: "All historical items deleted successfully" });
    } catch (error) {
        console.error("Erro ao deletar todos os itens do histórico: ", error);
        res.status(500).json({ message: "Internal server error" });
    }
});



// Rota GET para buscar o histórico
server.get('/historico', (req, res) => {

    if (data.historico.length === 0) {
        return res.status(404).json({ message: "O Histórico esta Vazio" });
    }
    res.json({
        items: data.historico
    });
});


