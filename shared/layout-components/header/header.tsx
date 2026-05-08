"use client"
import Link from 'next/link'
import React, { Fragment, useEffect, useState } from 'react';
import { ThemeChanger } from "../../redux/action";
import { connect } from 'react-redux';
import store from '@/shared/redux/store';
import { useAppSelector, useAppDispatch } from '@/shared/redux/hooks';
import { logout } from '@/shared/redux/authSlice';
import { useRouter } from 'next/navigation';
import Modalsearch from '../modal-search/modalsearch';
import { basePath } from '@/next.config';

const Header = ({ local_varaiable, ThemeChanger }: any) => {
  const authUser = useAppSelector((state) => state.auth.user);
  const dispatch = useAppDispatch();
  const router = useRouter();

  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = () => {
    if (!isFullscreen) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  useEffect(() => {
    const handleResize = () => {};
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  function menuClose() {
    const theme = store.getState();
    if (window.innerWidth <= 992) {
      ThemeChanger({ ...theme, dataToggled: "close" });
    } else {
      ThemeChanger({ ...theme, dataToggled: local_varaiable.dataToggled ? local_varaiable.dataToggled : '' });
    }
  }

  const toggleSidebar = () => {
    const theme = store.getState();
    let sidemenuType = theme.dataNavLayout;
    if (window.innerWidth >= 992) {
      if (sidemenuType === "vertical") {
        let verticalStyle = theme.dataVerticalStyle;
        const navStyle = theme.dataNavStyle;
        switch (verticalStyle) {
          case "closed":
            ThemeChanger({ ...theme, "dataNavStyle": "" });
            if (theme.dataToggled === "close-menu-close") {
              ThemeChanger({ ...theme, "dataToggled": "" });
            } else {
              ThemeChanger({ ...theme, "dataToggled": "close-menu-close" });
            }
            break;
          case "overlay":
            ThemeChanger({ ...theme, "dataNavStyle": "" });
            if (theme.dataToggled === "icon-overlay-close") {
              ThemeChanger({ ...theme, "dataToggled": "", "iconOverlay": '' });
            } else {
              if (window.innerWidth >= 992) {
                ThemeChanger({ ...theme, "dataToggled": "icon-overlay-close", "iconOverlay": '' });
              }
            }
            break;
          case "icontext":
            ThemeChanger({ ...theme, "dataNavStyle": "" });
            if (theme.dataToggled === "icon-text-close") {
              ThemeChanger({ ...theme, "dataToggled": "" });
            } else {
              ThemeChanger({ ...theme, "dataToggled": "icon-text-close" });
            }
            break;
          case "doublemenu":
            ThemeChanger({ ...theme, "dataNavStyle": "" });
            if (theme.dataToggled === "double-menu-open") {
              ThemeChanger({ ...theme, "dataToggled": "double-menu-close" });
            } else {
              let sidemenu = document.querySelector(".side-menu__item.active");
              if (sidemenu) {
                ThemeChanger({ ...theme, "dataToggled": "double-menu-open" });
                if (sidemenu.nextElementSibling) {
                  sidemenu.nextElementSibling.classList.add("double-menu-active");
                } else {
                  ThemeChanger({ ...theme, "dataToggled": "double-menu-close" });
                }
              }
            }
            break;
          case "detached":
            if (theme.dataToggled === "detached-close") {
              ThemeChanger({ ...theme, "dataToggled": "", "iconOverlay": '' });
            } else {
              ThemeChanger({ ...theme, "dataToggled": "detached-close", "iconOverlay": '' });
            }
            break;
          case "default":
            ThemeChanger({ ...theme, "dataToggled": "" });
        }
        switch (navStyle) {
          case "menu-click":
            if (theme.dataToggled === "menu-click-closed") {
              ThemeChanger({ ...theme, "dataToggled": "" });
            } else {
              ThemeChanger({ ...theme, "dataToggled": "menu-click-closed" });
            }
            break;
          case "menu-hover":
            if (theme.dataToggled === "menu-hover-closed") {
              ThemeChanger({ ...theme, "dataToggled": "" });
            } else {
              ThemeChanger({ ...theme, "dataToggled": "menu-hover-closed" });
            }
            break;
          case "icon-click":
            if (theme.dataToggled === "icon-click-closed") {
              ThemeChanger({ ...theme, "dataToggled": "" });
            } else {
              ThemeChanger({ ...theme, "dataToggled": "icon-click-closed" });
            }
            break;
          case "icon-hover":
            if (theme.dataToggled === "icon-hover-closed") {
              ThemeChanger({ ...theme, "dataToggled": "" });
            } else {
              ThemeChanger({ ...theme, "dataToggled": "icon-hover-closed" });
            }
            break;
        }
      }
    } else {
      if (theme.dataToggled === "close") {
        ThemeChanger({ ...theme, "dataToggled": "open" });
        setTimeout(() => {
          if (theme.dataToggled == "open") {
            const overlay = document.querySelector("#responsive-overlay");
            if (overlay) {
              overlay.classList.add("active");
              overlay.addEventListener("click", () => {
                const overlay = document.querySelector("#responsive-overlay");
                if (overlay) {
                  overlay.classList.remove("active");
                  menuClose();
                }
              });
            }
          }
          window.addEventListener("resize", () => {
            if (window.screen.width >= 992) {
              const overlay = document.querySelector("#responsive-overlay");
              if (overlay) overlay.classList.remove("active");
            }
          });
        }, 100);
      } else {
        ThemeChanger({ ...theme, "dataToggled": "close" });
      }
    }
  };

  const ToggleDark = () => {
    ThemeChanger({
      ...local_varaiable,
      "class": local_varaiable.class == 'dark' ? 'light' : 'dark',
      "dataHeaderStyles": local_varaiable.class == 'dark' ? 'light' : 'dark',
      "dataMenuStyles": local_varaiable.dataNavLayout == 'horizontal' ? local_varaiable.class == 'dark' ? 'light' : 'dark' : "dark"
    });
    const theme = store.getState();
    if (theme.class != 'dark') {
      ThemeChanger({ ...theme, "bodyBg": '', "Light": '', "darkBg": '', "inputBorder": '' });
      localStorage.setItem("ynexlighttheme", "light");
      localStorage.removeItem("ynexdarktheme");
      localStorage.removeItem("ynexMenu");
      localStorage.removeItem("ynexHeader");
    } else {
      localStorage.setItem("ynexdarktheme", "dark");
      localStorage.removeItem("ynexlighttheme");
      localStorage.removeItem("ynexMenu");
      localStorage.removeItem("ynexHeader");
    }
  };

  useEffect(() => {
    const navbar = document?.querySelector(".header");
    const navbar1 = document?.querySelector(".app-sidebar");
    const sticky: any = navbar?.clientHeight;
    function stickyFn() {
      if (window.pageYOffset >= sticky) {
        navbar?.classList.add("sticky-pin");
        navbar1?.classList.add("sticky-pin");
      } else {
        navbar?.classList.remove("sticky-pin");
        navbar1?.classList.remove("sticky-pin");
      }
    }
    window.addEventListener("scroll", stickyFn);
    window.addEventListener("DOMContentLoaded", stickyFn);
    return () => {
      window.removeEventListener("scroll", stickyFn);
      window.removeEventListener("DOMContentLoaded", stickyFn);
    };
  }, []);

  const handleLogout = () => {
    dispatch(logout());
    router.push('/');
  };

  return (
    <Fragment>
      <div className="app-header">
        <nav className="main-header !h-[3.75rem]" aria-label="Global">
          <div className="main-header-container ps-[0.725rem] pe-[1rem]">

            <div className="header-content-left">
              <div className="header-element">
                <div className="horizontal-logo">
                  <Link href="/dashboards/admin" className="header-logo">
                    <img src={`${process.env.NODE_ENV === "production" ? basePath : ""}/assets/images/brand-logos/desktop-logo.png`} alt="logo" className="desktop-logo" />
                    <img src={`${process.env.NODE_ENV === "production" ? basePath : ""}/assets/images/brand-logos/toggle-logo.png`} alt="logo" className="toggle-logo" />
                    <img src={`${process.env.NODE_ENV === "production" ? basePath : ""}/assets/images/brand-logos/desktop-dark.png`} alt="logo" className="desktop-dark" />
                    <img src={`${process.env.NODE_ENV === "production" ? basePath : ""}/assets/images/brand-logos/toggle-dark.png`} alt="logo" className="toggle-dark" />
                    <img src={`${process.env.NODE_ENV === "production" ? basePath : ""}/assets/images/brand-logos/desktop-white.png`} alt="logo" className="desktop-white" />
                    <img src={`${process.env.NODE_ENV === "production" ? basePath : ""}/assets/images/brand-logos/toggle-white.png`} alt="logo" className="toggle-white" />
                  </Link>
                </div>
              </div>
              <div className="header-element md:px-[0.325rem] !items-center" onClick={() => toggleSidebar()}>
                <Link aria-label="Hide Sidebar"
                  className="sidemenu-toggle animated-arrow hor-toggle horizontal-navtoggle inline-flex items-center" href="#!" scroll={false}><span></span></Link>
              </div>
            </div>

            <div className="header-content-right">

              {/* Search */}
              <div className="header-element py-[1rem] md:px-[0.65rem] px-2 header-search">
                <button aria-label="button" type="button" data-hs-overlay="#search-modal"
                  className="inline-flex flex-shrink-0 justify-center items-center gap-2 rounded-full font-medium focus:ring-offset-0 focus:ring-offset-white transition-all text-xs dark:bg-bgdark dark:hover:bg-black/20 dark:text-[#8c9097] dark:text-white/50 dark:hover:text-white dark:focus:ring-white/10 dark:focus:ring-offset-white/10">
                  <i className="bx bx-search-alt-2 header-link-icon"></i>
                </button>
              </div>

              {/* Dark/Light toggle */}
              <div className="header-element header-theme-mode hidden !items-center sm:block !py-[1rem] md:!px-[0.65rem] px-2" onClick={() => ToggleDark()}>
                <button aria-label="anchor"
                  className="hs-dark-mode-active:hidden flex hs-dark-mode group flex-shrink-0 justify-center items-center gap-2 rounded-full font-medium transition-all text-xs dark:hover:bg-black/20 dark:text-[#8c9097] dark:text-white/50 dark:hover:text-white dark:focus:ring-white/10 dark:focus:ring-offset-white/10"
                  data-hs-theme-click-value="dark">
                  <i className="bx bx-moon header-link-icon"></i>
                </button>
                <button aria-label="anchor"
                  className="hs-dark-mode-active:flex hidden hs-dark-mode group flex-shrink-0 justify-center items-center gap-2 rounded-full font-medium text-defaulttextcolor transition-all text-xs dark:hover:bg-black/20 dark:text-[#8c9097] dark:text-white/50 dark:hover:text-white dark:focus:ring-white/10 dark:focus:ring-offset-white/10"
                  data-hs-theme-click-value="light">
                  <i className="bx bx-sun header-link-icon"></i>
                </button>
              </div>

              {/* Fullscreen */}
              <div className="header-element header-fullscreen py-[1rem] md:px-[0.65rem] px-2">
                <button aria-label="anchor" onClick={() => toggleFullscreen()}
                  className="inline-flex flex-shrink-0 justify-center items-center gap-2 !rounded-full font-medium dark:hover:bg-black/20 dark:text-[#8c9097] dark:text-white/50 dark:hover:text-white dark:focus:ring-white/10 dark:focus:ring-offset-white/10">
                  {isFullscreen
                    ? <i className="bx bx-exit-fullscreen full-screen-close header-link-icon"></i>
                    : <i className="bx bx-fullscreen full-screen-open header-link-icon"></i>}
                </button>
              </div>

              {/* Profile dropdown */}
              <div className="header-element md:!px-[0.65rem] px-2 hs-dropdown !items-center ti-dropdown [--placement:bottom-left]">
                <button id="dropdown-profile" type="button"
                  className="hs-dropdown-toggle ti-dropdown-toggle !gap-2 !p-0 flex-shrink-0 sm:me-2 me-0 !rounded-full !shadow-none text-xs align-middle !border-0 !shadow-transparent">
                  <img className="inline-block rounded-full"
                    src={`${process.env.NODE_ENV === "production" ? basePath : ""}/assets/images/faces/9.jpg`}
                    width="32" height="32" alt="Profile" />
                </button>
                <div className="md:block hidden dropdown-profile">
                  <p className="font-semibold mb-0 leading-none text-[#536485] text-[0.813rem]">
                    {authUser?.firstName ? `${authUser.firstName} ${authUser.lastName || ''}`.trim() : 'User'}
                  </p>
                  <span className="opacity-[0.7] font-normal text-[#536485] block text-[0.6875rem]">
                    {authUser?.roles?.[0] || 'User'}
                  </span>
                </div>
                <div className="hs-dropdown-menu ti-dropdown-menu !-mt-3 border-0 w-[11rem] !p-0 border-defaultborder hidden main-header-dropdown pt-0 overflow-hidden header-profile-dropdown dropdown-menu-end"
                  aria-labelledby="dropdown-profile">
                  <ul className="text-defaulttextcolor font-medium dark:text-[#8c9097] dark:text-white/50">
                    <li>
                      <Link className="w-full ti-dropdown-item !text-[0.8125rem] !gap-x-0 !p-[0.65rem]" href="/settings">
                        <i className="ti ti-adjustments-horizontal text-[1.125rem] me-2 opacity-[0.7] !inline-flex"></i>Settings
                      </Link>
                    </li>
                    <li>
                      <button onClick={handleLogout}
                        className="w-full ti-dropdown-item !text-[0.8125rem] !p-[0.65rem] !gap-x-0 !inline-flex text-left">
                        <i className="ti ti-logout text-[1.125rem] me-2 opacity-[0.7] !inline-flex"></i>Log Out
                      </button>
                    </li>
                  </ul>
                </div>
              </div>

            </div>
          </div>
        </nav>
      </div>
      <Modalsearch />
    </Fragment>
  );
};

const mapStateToProps = (state: any) => ({
  local_varaiable: state.legacy || state
});
export default connect(mapStateToProps, { ThemeChanger })(Header);
