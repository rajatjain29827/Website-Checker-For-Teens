const mqtt=require('mqtt')

const publishOntoMQ=(flag)=>{
const client = mqtt.connect('mqtt://10.24.55.175:1883')

client.on('connect',()=>{
    console.log('PublisherTest connected to mosquitto')
    
    const payload = JSON.stringify({
        student:"25MCA0168",
        status:"Project Uploaded",
        timestamp:new Date().toLocaleString(),
        flag:true
    })
    
    if(flag)
    {    
        client.publish('vitt/mca/updates',payload,{qos:2})
        // res.redirect()
        client.end()
    }
    
})


}

module.exports={publishOntoMQ};