const express = require('express');
const request = require('request');
const cheerio = require('cheerio');
const app = express();
const PORT = 3000;

app.use(express.static('public'));

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/home.html');
});

app.get('/proxy', (req, res) => {
  let target = req.query.url;
  if (!target.startsWith('http')) target = 'http://' + target;

  const options = {
    url: target,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    }
  };

  request(options, (err, resp, body) => {
    if (err) return res.send('Error: ' + err.message);
    if (!body) return res.send('No response body.');

    const $ = cheerio.load(body);

    // Rewriting all anchor hrefs to go through our proxy
    $('a').each((i, el) => {
      const href = $(el).attr('href');
      if (href && !href.startsWith('javascript')) {
        const proxied = '/proxy?url=' + encodeURIComponent(new URL(href, target).href);
        $(el).attr('href', proxied);
      }
    });

    // Optionally rewrite other resources (images, scripts, etc.)
    $('img, script, link').each((i, el) => {
      const tag = el.name;
      const attr = tag === 'link' ? 'href' : 'src';
      const val = $(el).attr(attr);
      if (val && !val.startsWith('data:')) {
        $(el).attr(attr, new URL(val, target).href);
      }
    });

    res.send($.html());
  });
});

app.listen(PORT, () => {
  console.log(`Proxy running: http://localhost:${PORT}`);
});
