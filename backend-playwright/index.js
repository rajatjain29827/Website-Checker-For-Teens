const { isAlphaNumericString } = require('./isAlphaNumericStringFunc')
const express=require('express')
const { chromium } = require('playwright');
const bodyParser = require('body-parser');
const urlencodedParser=bodyParser.urlencoded({extended:true})
const cors=require('cors')
const session=require('express-session')

require('dotenv').config();
const axios = require('axios');

const cheerio=require('cheerio');
let data;
let link1;
const app=express()
app.use(express.json())
app.use(cors())

let maxWords=[]
let words;

const stopwords = [
  "a","an","the","and","or","but","if","then","else","when","while","for","to","of","in","on","at",
  "by","with","about","against","between","into","through","during","before","after","above","below",
  "from","up","down","out","over","under","again","further","more","most","some","such","no","nor",
  "not","only","own","same","so","than","too","very","can","will","just","should","could","would",
  "is","are","was","were","be","been","being","have","has","had","do","does","did","as","that","this",
  "these","those","he","she","it","they","them","his","her","its","their","we","us","you","your","yours",
  "i","me","my","mine","what","which","who","whom","whose","where","when","why","how","also","because",
  "there","here","than","per","each","every","either","neither","much","many","few","several","whatsoever",
  "any","both","other","others","another","such","thus","hence","upon",
  "must","shall","may","might","ought","let","lets","oughtn't","shan't","mustn't",
  "also","yet","nor","elsewhere","whereas","wherever","whenever","whither","whence",
  "per","via","amid","among","along","plus","minus","except","excluding","including",
  "regarding","concerning","versus","vs","albeit","alot","okay","ok","okay","okey",
  "i'm","you're","he's","she's","it's","we're","they're","i've","you've","we've","they've",
  "i'd","you'd","he'd","she'd","we'd","they'd","i'll","you'll","he'll","she'll","we'll","they'll",
  "ain't","can't","don't","doesn't","didn't","won't","wouldn't","couldn't","shouldn't","isn't","aren't",
  "please","thanks","thank","thanks","welcome","okay","ok","yeah","yes","nope","no","nah","hmm","huh",",",":",";",
  "`","~","-","_","=","+","'","'\"'"
];

function redactIdentity(text) {
    if (!text) return "";
    const identityRegex = /^([a-zA-Z0-9_ ]+[:\]])|(\[.*?\]\s)/gm;
    return text.replace(identityRegex, '<USER>: ');
}

const providerState = {
    hf: { last429: null, cooldownMs: 60000 },
    groq: { last429: null, cooldownMs: 60000 },
    gemini: { last429: null, cooldownMs: 60000 }
};

function isInCooldown(provider) {
    const state = providerState[provider];
    if (!state.last429) return false;
    return (Date.now() - state.last429) < state.cooldownMs;
}

function markCooldown(provider) {
    providerState[provider].last429 = Date.now();
}


async function callProvider(provider, prompt) {
    const { HF_API_KEY, GROQ_API_KEY, GEMINI_API_KEY, HF_MODEL, GROQ_MODEL, GEMINI_MODEL } = process.env;
    try {
        if (provider === 'hf') {
            const res = await axios.post(`https://api-inference.huggingface.co/models/${HF_MODEL}`, 
                { inputs: prompt }, 
                { headers: { Authorization: `Bearer ${HF_API_KEY}` }, timeout: 20000 }
            );
            const result = res.data[0]?.[0]?.label === 'toxic' || res.data[0]?.[0]?.score > 0.7;
            return { safe: !result, flags: result ? ['toxic'] : [], reason: result ? 'High toxicity detected' : 'Clean', details: res.data };
        } 
        if (provider === 'groq') {
            const res = await axios.post(`https://api.groq.com/openai/v1/chat/completions`, 
                { 
                    model: GROQ_MODEL, 
                    messages: [{ role: 'user', content: prompt }],
                    response_format: { type: 'json_object' }
                }, 
                { headers: { Authorization: `Bearer ${GROQ_API_KEY}` }, timeout: 20000 }
            );
            return JSON.parse(res.data.choices[0].message.content);
        } 
        if (provider === 'gemini') {
            const res = await axios.post(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`, 
                { contents: [{ parts: [{ text: prompt }] }] }, 
                { timeout: 20000 }
            );
            const content = res.data.candidates[0].content.parts[0].text;
            return JSON.parse(content);
        }
    } catch (err) {
        if (err.response?.status === 429) {
            throw { status: 429 };
        }
        throw err;
    }
}

function buildSafetyPrompt(text, keywords) {
    return `Analyze the following text for harmful categories:
- self-harm / suicide: ${keywords.filter(k => ['suicide', 'selfharm', 'self-harm', 'cutting'].includes(k)).join(', ')}
- violence / weapons: ${keywords.filter(k => ['gun', 'weapon', 'ak47', 'bomb', 'explosive', 'kill', 'gore'].includes(k)).join(', ')}
- drugs: ${keywords.filter(k => ['heroin', 'cocaine', 'meth', 'weed', 'pill', 'drug'].includes(k)).join(', ')}
- hate / harassment / fraud: ${keywords.filter(k => ['hack', 'crack', 'piracy', 'fraud', 'steal'].includes(k)).join(', ')}

Text: ${text}

Respond ONLY with a JSON object:
{ "safe": boolean, "flags": string[], "reason": "string", "details": {} }`;
}

function keywordFallback(keywords, maxWords) {
    for(let wordArr of maxWords){
        if(keywords.includes(wordArr[0])) {
            return { safe: false, flags: ['keyword-match'], reason: `Matched harmful keyword: ${wordArr[0]}`, details: {} };
        }
    }
    return { safe: true, flags: [], reason: 'No harmful keywords found', details: {} };
}

app.post('/api',urlencodedParser,async function(req,res){
    let link1=req.body?.link;
    if (!link1) {
        res.status(400).json({ error: 'link required' });
        return;
    }
    
    await getData(link1);
    let processedData = data.toLowerCase();
    
    const anonymizedData = redactIdentity(processedData);
    
    let tempWords = anonymizedData.split(' ')
    tempWords = tempWords.filter(word=> !stopwords.includes(word))
    let wordCounts = tempWords.reduce((acc, v) => {
        acc[v] = (acc[v] || 0) + 1;
        return acc;
    },{})
    let sortedWords = Object.entries(wordCounts).sort(([,v1],[,v2])=>v2-v1)
    let topWords = sortedWords.filter(([],idx)=>idx<50)

    const inappropriateKeywords = [  "gore",  "snuff",  "beheading",  "torture",
    "kill",  "suicide",  "selfharm", "self-harm" ,"harm",  "cutting",  "heroin",  "cocaine",  "meth",
    "weed",  "pill",  "drug",  "bomb",  "explosive",  "gun",  "weapon",  "ak47",
    "parts",  "schematics",  "hack",  "crack",  "piracy",  "torrent",  "steal",
    "fraud",  "creditcard",  "generator",  "casino",  "slots",  "betting",  "poker",
    "bet",  "trafficking",  "exploitation",  "recruitment",  "terror",  "extremist","arms","firearms",
    "rifle"
];

    let result = null;
    const prompt = buildSafetyPrompt(anonymizedData, inappropriateKeywords);
    
    for (const provider of ['hf', 'groq', 'gemini']) {
        if (isInCooldown(provider)) continue;
        try {
            result = await callProvider(provider, prompt);
            break; 
        } catch (err) {
            if (err.status === 429) markCooldown(provider);
            continue;
        }
    }

    if (!result) {
        result = keywordFallback(inappropriateKeywords, topWords);
    }

    res.json(result);
})

async function getData(geminiLink){
    try{
        const browser=await chromium.launch({headless:true});
        const page = await browser.newPage();
        page.setDefaultNavigationTimeout(3000000)
        page.setDefaultTimeout(3000000)
        await page.goto(geminiLink)
        await page.waitForSelector('body')
        await page.waitForLoadState('networkidle')
        const html = await page.evaluate(() => document.documentElement.outerHTML);
        const $ = cheerio.load(html)
        data = $(`div`).text().trim();
        await browser.close()
    }catch(err){console.log(err)}
}

app.listen(4000,'0.0.0.0')
