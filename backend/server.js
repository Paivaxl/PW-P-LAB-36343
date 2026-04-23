import morgan from 'morgan'
import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { PrismaPg } from "@prisma/adapter-pg";
import pkg from '@prisma/client'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

dotenv.config()



const app = express()
app.use(morgan('dev'))
app.use(cors())
app.use(express.json())
app.use(express.static('frontend'))

const { PrismaClient } = pkg

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL })
})


const authenticateToken = (req, res, next) => {
  const authHeader = req.header('Authorization');
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) return res.status(401).json({ message: 'Acesso negado' });

  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET);
    req.user = verified;
    next();
  } catch (err) {
    res.status(400).json({ message: 'Token inválido' });
  }
};;


let movies = [
    {id: 1, title: "Inception", year: 2010},
    {id: 2, title: "Interestellar", year: 2014}
];


app.post('/auth/signup', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email e senha são obrigatórios' });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: 'Usuário já existe' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { email, password: hashedPassword }
    });

    res.status(201).json({ message: 'Usuário criado com sucesso', user: { id: user.id, email: user.email } });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao criar usuário', error: error.message });
  }
});

app.post('/auth/signin', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email e senha são obrigatorios' });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(400).json({ message: 'Usuario nao encontrado' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({ message: 'Senha incorreta' });
    }

    const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.status(200).json({ message: 'Login bem-sucedido', token });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao fazer login', error: error.message });
  }
});

app.get("/movies", authenticateToken, (req, res) => {
    if (movies.length === 0) {
        return res.status(404).json({ message: "No movies found"})
    }

       res.status(200).json(movies)
})

app.post("/movies", authenticateToken, (req, res) => {
    const { title, year } = req.body

    const id = movies.length + 1

    const newMovie = {
        id,
        title,
        year
    }

    movies.push(newMovie)

    res.status(200).json({ message: "Sucesso ao cadastrar um filme.", newMovie: newMovie})
})

app.put("/movies/:id", authenticateToken, (req, res) => {
    const { id } = req.params 
    const { title, year} = req.body

    const movie = movies.find((movie) => movie.id == id)
    
    if (title) {
        movie.title = title
    }

    if ( year ){
        movie.year = year
    }

    if (!title && !year) {
        return res.status(404).json({ message : `Sucesso ao editar o filme de id ${id}`})
    }

    return res.status(200).json({ message: `Sucesso ao editar o filme de id ${id}`})
})

app.delete("/movies/:id", authenticateToken, (req, res) => {
    const { id } = req.params

    const movieToDelete = movies.filter((movie) => movie.id == id)

    movies = movies.filter((movie) => movie.id != movieToDelete[0].id)

    res.status(200).json({ message: "Sucesso ao acessar rota de delete", updateMoviesList: movies})
})

//task

let tasks = [
  { id: 1, title: "Estudar Node.js", completed: false, priority: "high" },
  { id: 2, title: "Fazer LAB-1", completed: true, priority: "medium" }
];

app.get('/tasks', authenticateToken, (req, res) => {

    const { completed } = req.query

    if(completed == undefined) {
        return res.status(200).json({ message: "Sucesso ao acessar a lista de filmes", tasks: tasks })
    }

    const isCompleted = completed === 'true'

    const tasksList = tasks.filter(task => task.completed === isCompleted)
    
    res.status(200).json({ 
        message: "Sucesso ao buscar tarefa", 
        tasksList 
    })
})

app.get('/tasks/stats', authenticateToken, (req, res) => {
    let completedTasks = 0
    let pendentTasks = 0

    tasks.forEach(task => {
        if (task.completed) {
            completedTasks++
        }
    })
    
    tasks.forEach(task => {
        if (task.completed === false) {
            pendentTasks++
        }
    })

    res.status(200).json({ 
        message: "Sucesso ao buscar status gerais das tarefas", 
        tasksList: {
            totalTasks: tasks.length,
            completedTasks: completedTasks,
            pendentTasks: pendentTasks
        } 
    })
})

app.get('/tasks/:id', authenticateToken, (req, res) => {

    const { 
        id
    } = req.params
    
    if (!id) {
        return res.status(404).json({ message: "Não foi adicionado nenhum ID aos parâmetros" })
    }

    const task = tasks.find((task) => task.id == id)

    if (!task) {
        return res.status(404).json({ message: "Não foi achado nenhuma task com este ID" })
    }

    res.status(200).json({ message: "Sucesso ao buscar tarefa", task })
})

app.post('/tasks', authenticateToken, (req, res) => {
    console.log('POST /tasks chamado com body:', req.body);

    const tasksLenght = tasks.length

    const {
        title,
        priority
    } = req.body

    if (!title || !priority) {
        console.log('Erro: title ou priority faltando');
        return res.status(400).json({ message: "Por favor, insira o titulo da task e o sua prioridade" })
    }

    if (priority != "low" && priority != "medium" && priority != "high") {
        console.log('Erro: prioridade inválida:', priority);
        return res.status(400).json({ message: "Por favor, insira uma prioridade válida (low, medium ou high)." })
    }

    const newTask = {
        id: tasksLenght + 1,
        title,
        completed: false,
        priority
    }

    tasks.push(newTask)
    console.log('Task criada:', newTask);

    res.status(200).json({ message: "Sucesso ao adicionar task nova", updatedTasks: tasks })
})

app.put('/tasks/:id', authenticateToken, (req, res) => {
    
    const { id } = req.params
    const { title, priority } = req.body

    const taskToEdit = tasks.filter(task => task.id == id)

    if (title) {
        taskToEdit[0].title = title
    } 
    if (priority) {
        taskToEdit[0].priority = priority
    }

    if (!title && !priority) {
        return res.status(404).json({ message: "Nenhum dado foi passado para que a edição fosse realizada" })
    }

    res.status(200).json({ message: `Sucesso ao editar o filme de id ${id}`, updatedTasks: tasks })
})

app.patch('/tasks/:id/toggle', authenticateToken, (req, res) => {
    
    const { id } = req.params

    if (!id) return res.status(404).json({ message: "Forneça um ID"})

    const taskToEdit = tasks.filter(task => task.id == id)

    if (taskToEdit.length == 0) return res.status(404).json({ message: "Impossivel encontrar task com esse ID."})

    taskToEdit[0].completed = !taskToEdit[0].completed

    res.status(200).json({ message: `Sucesso ao editar o task de id ${id}`, updatedTask: taskToEdit[0] })
})

app.delete('/tasks/:id', authenticateToken, (req, res) => {

    const { id } = req.params

    if (!id) return res.status(404).json({ message: "Forneça um ID"})

    const taskToDelete = tasks.filter(task => task.id == id)

    if (taskToDelete.length == 0) return res.status(404).json({ message: "Impossivel encontrar task com esse ID."})
    
    tasks = tasks.filter(tasks => tasks.id != taskToDelete[0].id)

    res.status(200).json({ message: "Sucesso ao deletar tarefa", updatedTasks: tasks})
})


app.get('/prisma/tasks', authenticateToken, async (req,res) => {
    const { completed } = req.query
    
    const iscompleted = completed === "true"    


    if (completed) {
        const tasks = await prisma.tasks.findMany({
            where: {
                completed: iscompleted
            }
        })
        if(tasks.length == 0) {
           return res.status(404).json({ message: "Nenhuma task encontrada com esse status de conclusão."})  
        }
        return res.status(200).json({ message: "Sucesso ao buscar tarefas", finalTasks: tasks })
    }
    const tasks = await prisma.tasks.findMany()

    if (tasks.length == 0) {
        return res.status(404).json({ message: "Nenhuma task encontrada."})
    }
    res.status(200).json({ message: "Sucesso ao buscar tarefas", tasks })
})

app.get('/prisma/tasks/:id', authenticateToken, async (req, res) => {
    const { id } = req.params
    const parsedId = parseInt(id)
    const task = await prisma.tasks.findUnique({
        where: {
            id: parsedId
        }
    })
    if (!task) {
        return res.status(404).json({ message: "Impossivel encontrar task com esse ID." })
    }
    res.status(200).json({ message: "Sucesso ao buscar tarefa", task })
})

app.get('/prisma/tasks/stats', authenticateToken, async (req, res) => {
    const completedTasks = await prisma.tasks.count({
        where: {
            completed: true
        }
    })
    const pendingTasks = await prisma.tasks.count({
        where: {
            completed: false
        }
    })
    res.status(200).json({ message: "Sucesso ao buscar estatísticas", completedTasks, pendingTasks })
})

app.post('/prisma/tasks', authenticateToken, async (req, res) => {
    const { title, priority } = req.body

    if (!title || !priority) {
        return res.status(404).json({ message: "Por favor, insira o titulo da task e o sua prioridade" })
    }   
    if (priority != "low" && priority != "medium" && priority != "high") {
        return res.status(404).json({ message: "Por favor, insira uma prioridade válida (low, medium ou high)." })
    }

    const newTask = await prisma.tasks.create({
        data: {
            title,
            priority,
            completed: false
        }
    })  

    res.status(200).json({ message: "Sucesso ao criar nova task", newTask })
})  

app.put('/prisma/tasks/:id', authenticateToken, async (req, res) => {
    const { id } = req.params
    const { title, priority } = req.body

    const parsedId = parseInt(id)
    const taskToEdit = await prisma.tasks.update({
        where: {
            id: parsedId
        },
        data: {
            title,
            priority
        }
    })

    if (!taskToEdit) {
        return res.status(404).json({ message: "Impossivel encontrar task com esse ID." })
    }
    res.status(200).json({ message: `Sucesso ao editar o task de id ${id}`, updatedTask: taskToEdit })
})

app.delete('/prisma/tasks/:id', authenticateToken, async (req, res) => {
    const { id } = req.params
    const parsedId = parseInt(id)
    const taskToDelete = await prisma.tasks.findUnique({
        where: {
            id: parsedId
        }
    })
    if (!taskToDelete) {
        return res.status(404).json({ message: "Impossivel encontrar task com esse ID." })
    }
    await prisma.tasks.delete({
        where: {
            id: parsedId
        }
    })
    res.status(200).json({ message: "Sucesso ao deletar tarefa"})
})

app.patch('/prisma/tasks/:id/toggle', authenticateToken, async (req, res) => {
    const { id } = req.params
    const parsedId = parseInt(id)
    const taskToEdit = await prisma.tasks.findUnique({
        where: {
            id: parsedId
        }
    })
    if (!taskToEdit) {
        return res.status(404).json({ message: "Impossivel encontrar task com esse ID." })
    }
    const updatedTask = await prisma.tasks.update({
        where: {
            id: parsedId
        },
        data: {
            completed: !taskToEdit.completed
        }
    })
    res.status(200).json({ message: `Sucesso ao editar o task de id ${id}`, updatedTask })
})

const port = process.env.SERVER_PORT || 3000

app.listen(port, () => {
    console.log("Servidor rodando.", port)
})
