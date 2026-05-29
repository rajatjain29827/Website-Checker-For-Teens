const { publishOntoMQ } = require('./publisherTest')
const { isAlphaNumericString } = require('./isAlphaNumericStringFunc')
const express=require('express')
const puppeteer=require('puppeteer');
const bodyParser = require('body-parser');
const urlencodedParser=bodyParser.urlencoded({extended:true})
const cors=require('cors')
const session=require('express-session')


const cheerio=require('cheerio');
let data;
let link1;
app=express()
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
  // additions requested + common auxiliaries/modal/conjunctive words
  "must","shall","may","might","ought","let","lets","oughtn't","shan't","mustn't",
  "also","yet","nor","elsewhere","whereas","wherever","whenever","whither","whence",
  "per","via","amid","among","along","plus","minus","except","excluding","including",
  "regarding","concerning","versus","vs","albeit","alot","okay","ok","okay","okey",
  // common contractions (optional, include if you split words keeping apostrophes)
  "i'm","you're","he's","she's","it's","we're","they're","i've","you've","we've","they've",
  "i'd","you'd","he'd","she'd","we'd","they'd","i'll","you'll","he'll","she'll","we'll","they'll",
  "ain't","can't","don't","doesn't","didn't","won't","wouldn't","couldn't","shouldn't","isn't","aren't",
  // politeness/filler/response words
  "please","thanks","thank","thanks","welcome","okay","ok","yeah","yes","nope","no","nah","hmm","huh",",",":",";",
  "`","~","-","_","=","+","'",'"'
];


app.post('/api',urlencodedParser,async function(req,res){
    let link1=req.body?.link;
    if (!link1) {
        console.log(link1)
        res.status(400).json({ error: 'link required' });
    }
    if(link1){
    await getData(link1);
    data=data.toLowerCase()
     console.log("data......")
   
    console.log(data)
    words=data.split(' ')
    words=words.filter(word=> !stopwords.includes(word))
 console.log("words......\n")
  console.log(words)
   
   
    words=words.reduce((acc, v) => {
    acc[v] = (acc[v] || 0) + 1;
    return acc;
  },{})
    console.log(words)
    // for(let key of Object.keys(words))
    // {
    //     value=words[key];
    //     if(value<=2)
    //     {  delete words[key]}
    // }
    console.log(words)
    words=Object.entries(words).sort(([,v1],[,v2])=>v2-v1)
    console.log(words)
    words.filter(([value,],idx)=>{
        console.log("value:",value)
        return isAlphaNumericString(String(value))
    })
    maxWords=words.filter(([],idx)=>idx<50)

    console.log(words)
    console.log('maxwords...')
    console.log(maxWords)

    const inappropriateKeywords = [  "gore",  "snuff",  "beheading",  "torture",
  "kill",  "suicide",  "selfharm", "self-harm" ,"harm",  "cutting",  "heroin",  "cocaine",  "meth",
  "weed",  "pill",  "drug",  "bomb",  "explosive",  "gun",  "weapon",  "ak47",
  "parts",  "schematics",  "hack",  "crack",  "piracy",  "torrent",  "steal",
  "fraud",  "creditcard",  "generator",  "casino",  "slots",  "betting",  "poker",
  "bet",  "trafficking",  "exploitation",  "recruitment",  "terror",  "extremist","arms","firearms",
  "rifle"

];


    for(wordArr of maxWords){
        if(inappropriateKeywords.includes(wordArr[0]))
        {
            console.log('Need to look up for yourselves')
            publishOntoMQ(true);
            console.log('Flag set to true')
            maxWords='Do not visit this website'
            break;
            
        }
    }

    res.send(maxWords);
    }
})

async function getData(geminiLink){
    try{
    const browser=await puppeteer.launch({headless:true});
    
    const page = await browser.newPage();
    page.setDefaultNavigationTimeout(3000000)
    page.setDefaultTimeout(3000000)
    await page.goto(geminiLink)
    await page.waitForSelector('body')
    await page.waitForNetworkIdle()
    const title = await page.title();
    console.log(`Page title: ${title}`);

    const content =  await page.content();
    

    const html = await page.evaluate(() => document.documentElement.outerHTML);
    const $=cheerio.load(html)
    const val=0;
    await page.waitForNetworkIdle()
    await page.waitForSelector(`div`)
    await page.waitForNetworkIdle()
    data = $(`div`).text().trim();
    console.log(data.length)

    await browser.close()
    }catch(err){console.log(err)}
}

// app.get('/api',async function(req,res){
//     await getData(link);
//     res.send(data);
// })

// getData('https://gemini.google.com/share/ca234d5e21e4')
app.listen(4000,'0.0.0.0')