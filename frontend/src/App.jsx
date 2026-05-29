import { useState } from 'react' 
import React from 'react'
import  { BrowserRouter, Route, Router, Routes, useRoutes, Link} from 'react-router-dom'
import './App.css'
import SubmitLink from '../components/SubmitLink'
import NavBar from '../components/NavBar'
import Login from '../components/Login'
import Register from '../components/Register'
import LoginNavBar from '../components/LoginNavBar'
import TrustedContacts from '../components/TrustedContacts'

const loginFlag=false

function App() {
  const [count, setCount] = useState(0)

  function navbar(){
    if(loginFlag)
      {<LoginNavBar />}
    else
    {
      <NavBar />
    }
  }

  return (
    <>
      
     <NavBar />
      
      <Routes>
        <Route path="/" element={<SubmitLink  />} />
        <Route path="/api" element={<Login />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} /> 
        <Route path="/trustedContacts" element={<TrustedContacts />}/>       
      </Routes>
      
     
      

    </>
  );
}

export default App
