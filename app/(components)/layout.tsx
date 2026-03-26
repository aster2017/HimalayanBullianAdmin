"use client"
import React, { useContext, useEffect, useMemo, useState } from 'react'
import { connect } from 'react-redux';
import  * as switcherdata from '../../shared/data/switcherdata/switcherdata';
import { ThemeChanger } from '@/shared/redux/action';
import { Initialload } from '@/shared/contextapi';

function Layout({children, local_varaiable, ThemeChanger}:any) {
  const theme :any= useContext(Initialload);

  useEffect(() => {
    if (typeof window !== 'undefined' && !theme.pageloading) {
      switcherdata.LocalStorageBackup(ThemeChanger, theme.setpageloading);
    }
  }, []);

  useEffect(() => {
    // Apply all theme attributes to html element
    if (typeof document !== 'undefined' && local_varaiable) {
      const htmlEl = document.documentElement;

      if (local_varaiable.dir) htmlEl.setAttribute('dir', local_varaiable.dir);
      if (local_varaiable.class) htmlEl.setAttribute('class', local_varaiable.class);
      if (local_varaiable.dataHeaderStyles) htmlEl.setAttribute('data-header-styles', local_varaiable.dataHeaderStyles);
      if (local_varaiable.dataVerticalStyle) htmlEl.setAttribute('data-vertical-style', local_varaiable.dataVerticalStyle);
      if (local_varaiable.dataNavLayout) htmlEl.setAttribute('data-nav-layout', local_varaiable.dataNavLayout);
      if (local_varaiable.dataMenuStyles) htmlEl.setAttribute('data-menu-styles', local_varaiable.dataMenuStyles);
      if (local_varaiable.dataToggled) htmlEl.setAttribute('data-toggled', local_varaiable.dataToggled);
      if (local_varaiable.dataNavStyle) htmlEl.setAttribute('data-nav-style', local_varaiable.dataNavStyle);
      if (local_varaiable.horStyle) htmlEl.setAttribute('hor-style', local_varaiable.horStyle);
      if (local_varaiable.dataPageStyle) htmlEl.setAttribute('data-page-style', local_varaiable.dataPageStyle);
      if (local_varaiable.dataWidth) htmlEl.setAttribute('data-width', local_varaiable.dataWidth);
      if (local_varaiable.dataMenuPosition) htmlEl.setAttribute('data-menu-position', local_varaiable.dataMenuPosition);
      if (local_varaiable.dataHeaderPosition) htmlEl.setAttribute('data-header-position', local_varaiable.dataHeaderPosition);
      if (local_varaiable.iconOverlay) htmlEl.setAttribute('data-icon-overlay', local_varaiable.iconOverlay);
      if (local_varaiable.bgImg) htmlEl.setAttribute('bg-img', local_varaiable.bgImg);
      if (local_varaiable.iconText) htmlEl.setAttribute('data-icon-text', local_varaiable.iconText);

      // Apply CSS variables
      if (local_varaiable.colorPrimaryRgb) htmlEl.style.setProperty('--primary-rgb', local_varaiable.colorPrimaryRgb);
      if (local_varaiable.colorPrimary) htmlEl.style.setProperty('--primary', local_varaiable.colorPrimary);
      if (local_varaiable.darkBg) htmlEl.style.setProperty('--dark-bg', local_varaiable.darkBg);
      if (local_varaiable.bodyBg) htmlEl.style.setProperty('--body-bg', local_varaiable.bodyBg);
      if (local_varaiable.inputBorder) htmlEl.style.setProperty('--input-border', local_varaiable.inputBorder);
      if (local_varaiable.Light) htmlEl.style.setProperty('--light', local_varaiable.Light);
    }
  }, [local_varaiable]);

  return (
    <>
      {theme.pageloading && children}
    </>
  )
}

const mapStateToProps = (state: any) => ({
  local_varaiable: state.legacy || state
});

export default connect(mapStateToProps, {ThemeChanger})(Layout);
