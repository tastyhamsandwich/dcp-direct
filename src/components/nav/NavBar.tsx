import React from 'react'
import NavLinks from './NavLinks';
import NavRight from './NavRight';
import '@app/styles.module.css';

const NavBar = () => {

  return (
    <div className="navbar-container">
      <div className="left-container">
        <NavLinks/>
      </div>
      <div className ="right-container">
        <NavRight/>
      </div>
    </div>
  )
}

export default NavBar;