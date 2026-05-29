function isAlphaNumericString(value){
    // console.log(value)
    for( i in String(value))
    {
        charCode=String(value).charCodeAt(i)
        
        if(charCode>='0'.charCodeAt(0) || charCode<='9'.charCodeAt(0))
            continue
        if(charCode >= 'a'.charCodeAt(0) && charCode <= 'z'.charCodeAt(0))
            continue
        else if(charCode >= 'A'.charCodeAt(0) && charCode <= 'Z'.charCodeAt(0))
            continue
        else
            return false

    }
    return true

}

// console.log(isAlphaString("56"))

module.exports={isAlphaNumericString}