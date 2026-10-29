const mqtt = require('mqtt')
// const {Adb} = require('@devicefarmer/adbkit');
// const { Client } = require('ssh2')
const termux=require('termux')


const options={

    clientId:'007JamesBond',
    clean:false,
    qos: 2,
}


const client=mqtt.connect('mqtt://10.24.55.175:1883', options )

client.on('connect',()=>{
    console.log('Connected to broker at mqtt://localhost:1883')

    client.subscribe('vitt/mca/updates',{qos:2},(err)=>{
        if(!err){
            console.log('Subscribed to vitt/mca/updates');
        }else{
            console.log("error")
        }
    })
})

// async function smsViaADBkit(phoneNumber,msg){
//     const adbClient = Adb.createClient();
//         console.log(Object.keys(adbClient))
//         try{
//         const devices = await adbClient.listDevices()
//         deviceId=devices[0]
//         if(devices.length===0)
//         {
//             console.log('No devices found')
//         }
//         await adbClient.shell(deviceId, `am start -a android.intent.action.SENDTO -d sms:${phoneNumber} --es sms_body "${msg}"`);
        
//         console.log("Intent triggered. Simulating 'Send' button press...");

//         // 3. Wait 1.5 seconds for the app to UI load, then simulate the "Enter" key (Keycode 66)
//         setTimeout(async () => {
//             await adbClient.shell(deviceId, 'input keyevent 66');
//             console.log("SMS sent successfully.");
//         }, 1500);

//     } catch (err) {
//         console.error("Something went wrong:", err.stack);
//     }
// }



client.on('message',(topic,message)=>{
    console.log(`Topic:${topic} | Message:${message.toString()}`)
    message=JSON.parse(message)
    if(message["flag"])
    {
        console.log('Functionality of Message to be sent here')
        termux.sms({
            // number:"918279235044"
            message:"Hello from node"
        }).then(
            console.log('Message sent')
        ).catch(
            console.log('Message not sent')
        )
    }
})