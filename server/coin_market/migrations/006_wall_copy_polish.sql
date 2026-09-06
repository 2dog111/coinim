UPDATE messages
SET message = 'Draw an interface freehand. pen.dev turns the sketch into clean code inside your editor. Two minutes in, forty design panels start looking ridiculous.',
    cta_label = 'Open pen.dev'
WHERE slug = 'pen-dev-wall-seed';

UPDATE messages
SET message = 'Half of my 312 followers are probably bots. Every Sunday I write one letter about leaving the corporate treadmill, including the slow, unglamorous part people usually skip. If loud internet people have worn you out, this is my quiet corner.',
    cta_label = 'Open on X'
WHERE slug = 'midnightdrafter-wall-seed';

UPDATE messages
SET message = 'Most of the internet is written to be scrolled past. I paid real money for these words and left no link, product or name.' || char(10) || char(10) || 'If you read this far, you still read. Keep that habit. It pays better than most skills.',
    signature = 'anonymous',
    url = 'https://x.com/intent/post?text=Most%20of%20the%20internet%20is%20written%20to%20be%20scrolled%20past.%20I%20paid%20real%20money%20for%20these%20words%20and%20left%20no%20link%2C%20product%20or%20name.%20coin.im',
    cta_label = 'Quote on X'
WHERE slug = 'on-silence-wall-seed';
