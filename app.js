const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));

app.get('/', (req,res) => {
    res.render('index');
});

app.listen(PORT, () => {
    console.log(`Example app listening at http://localhost:${PORT}`);
});
