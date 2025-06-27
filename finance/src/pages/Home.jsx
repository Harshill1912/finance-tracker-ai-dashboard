import React from 'react'
import Navbar from '../components/navbar'
import Hero from '../components/hero'
import Feature from '@/components/feature'
import Footer from '@/components/footer'
function Home() {
  return (
    <div>
     <Navbar/>
     <Hero/>
     <Feature/>
     <Footer/>
    </div>
  )
}

export default Home