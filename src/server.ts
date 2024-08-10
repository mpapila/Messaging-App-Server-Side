import express from 'express';
import cors from 'cors'

const app = express();
app.use(cors());
app.use(express.json());      //It is important put cors and express before roter
// app.use('/', router)

app.listen('3000', () => {
    console.log(`server is running at 3000`)
})
