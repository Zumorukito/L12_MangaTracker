const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

app.use(express.static('public'));

let manhwaList = [
    {id: 1, name: 'Evolution From a Tree', image: '/images/IMG_1944.webp', chapter: 273, status: 'Reading'},
    {id: 2,name: 'Logging 10,000 Years into the Future',image: '/images/IMG_1945.webp',chapter: 256,status: 'Reading'},
    {id: 3,name: "Subscribing To The Transcendent’s Channel",image: '/images/IMG_1946.webp',chapter: 101,status: 'Reading'}
];

app.get('/', (req, res) => {
    const search = req.query.search || '';

    const filteredList = manhwaList.filter(manhwa =>
        manhwa.name.toLowerCase().includes(search.toLowerCase())
    );

    res.render('index', {manhwaList: filteredList,search: search, pageTitle: 'Home'});
});

app.get('/completed', (req, res) => {
    const completedList = manhwaList.filter(manhwa => manhwa.status === 'Completed');

    res.render('index', {manhwaList: completedList,search: '',pageTitle: 'Completed'});
});

app.get('/addmanhwa', (req, res) => {
    res.render('addmanhwa');
});

app.get('/viewmanhwa/:id', (req, res) => {
    const id = parseInt(req.params.id);

    const manhwa = manhwaList.find(manhwa => manhwa.id === id);

    res.render('viewmanhwa', { manhwa: manhwa });
});

app.post('/addmanhwa', (req, res) => {
    parseMultipartForm(req, (err, fields, files) => {
        if (err) {
            return res.send('Upload error: ' + err.message);
        }

        const newId = manhwaList.length > 0 ? manhwaList[manhwaList.length - 1].id + 1 : 1;

        manhwaList.push({
            id: newId,
            name: fields.name,
            image: files.image.path,
            chapter: fields.chapter,
            status: fields.status
        });

        res.redirect('/');
    });
});

const imageFolder = path.join(__dirname, 'public', 'images');

if (!fs.existsSync(imageFolder)) {
    fs.mkdirSync(imageFolder, { recursive: true });
}

function parseMultipartForm(req, callback) {
    const contentType = req.headers['content-type'] || '';
    const boundaryMatch = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i);

    if (!boundaryMatch) {
        return callback(new Error('No upload boundary found'));
    }

    const boundary = '--' + (boundaryMatch[1] || boundaryMatch[2]);
    const boundaryBuffer = Buffer.from(boundary);

    let chunks = [];
    let totalSize = 0;
    let called = false;
    const maxSize = 5 * 1024 * 1024;

    function finish(err, fields, files) {
        if (called) return;
        called = true;
        callback(err, fields, files);
    }

    req.on('data', chunk => {
        totalSize += chunk.length;

        if (totalSize > maxSize) {
            finish(new Error('Image too large. Max size is 5MB.'));
            req.destroy();
            return;
        }

        chunks.push(chunk);
    });

    req.on('end', () => {
        const body = Buffer.concat(chunks);
        const fields = {};
        const files = {};

        let start = body.indexOf(boundaryBuffer);

        while (start !== -1) {
            start += boundaryBuffer.length;

            if (body[start] === 45 && body[start + 1] === 45) {
                break;
            }

            if (body[start] === 13 && body[start + 1] === 10) {
                start += 2;
            }

            const next = body.indexOf(boundaryBuffer, start);

            if (next === -1) {
                break;
            }

            let part = body.slice(start, next);

            if (part.length >= 2 && part[part.length - 2] === 13 && part[part.length - 1] === 10) {
                part = part.slice(0, -2);
            }

            const headerEnd = part.indexOf(Buffer.from('\r\n\r\n'));

            if (headerEnd === -1) {
                start = next;
                continue;
            }

            const headerText = part.slice(0, headerEnd).toString();
            const content = part.slice(headerEnd + 4);

            const nameMatch = headerText.match(/name="([^"]+)"/);

            if (!nameMatch) {
                start = next;
                continue;
            }

            const fieldName = nameMatch[1];
            const filenameMatch = headerText.match(/filename="([^"]*)"/);

            if (filenameMatch && filenameMatch[1]) {
                const originalName = path.basename(filenameMatch[1]);
                const fileTypeMatch = headerText.match(/Content-Type:\s*([^\r\n]+)/i);
                const fileType = fileTypeMatch ? fileTypeMatch[1].trim() : '';

                if (!fileType.startsWith('image/')) {
                    return finish(new Error('Only image files are allowed.'));
                }

                const ext = path.extname(originalName) || '.jpg';
                const newFileName = Date.now() + '-' + crypto.randomBytes(4).toString('hex') + ext.toLowerCase();

                fs.writeFileSync(path.join(imageFolder, newFileName), content);

                files[fieldName] = {
                    filename: newFileName,
                    path: '/images/' + newFileName
                };
            } else {
                fields[fieldName] = content.toString();
            }

            start = next;
        }

        finish(null, fields, files);
    });

    req.on('error', err => {
        finish(err);
    });
}

app.get('/editmanhwa/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const manhwa = manhwaList.find(manhwa => manhwa.id === id);

    res.render('editmanhwa', { manhwa: manhwa });
});

app.post('/editmanhwa/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const manhwa = manhwaList.find(manhwa => manhwa.id === id);

    manhwa.name = req.body.name;
    manhwa.image = req.body.image;
    manhwa.chapter = req.body.chapter;
    manhwa.status = req.body.status;

    res.redirect('/');
});

app.post('/deletemanhwa/:id', (req, res) => {
    const id = parseInt(req.params.id);

    manhwaList = manhwaList.filter(manhwa => manhwa.id !== id);

    res.redirect('/');
});

app.listen(PORT, () => {
    console.log(`Example app listening at http://localhost:${PORT}`);
});