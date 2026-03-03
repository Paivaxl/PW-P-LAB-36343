import morgan from 'morgan'
import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'

dotenv.config()

const app = express()
app.use(morgan('dev'))
app.use(cors())
app.use(express.json())


let movies = [
    {id: 1, title: "Inception", year: 2010},
    {id: 2, title: "Interestellar", year: 2014}
];


app.get("/movies", (req, res) => {
    if (movies.length === 0) {
        return res.status(404).json({ message: "No movies found"})
    }

       res.status(200).json(movies)
})

app.post("/movies", (req, res) => {
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

app.put("/movies/:id", (req, res) => {
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

const PORT = process.env.SERVER_PORT || 3000

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`)
})

app.delete("/movies/:id", (req, res) => {
    const { id } = req.params

    const movieToDelete = movies.filter((movie) => movie.id == id)

    movies = movies.filter((movie) => movie.id != movieToDelete[0].id),

    res.status(200).json({ message: "Sucesso ao acessar rota de delete", updateMoviesList: movies})

})

