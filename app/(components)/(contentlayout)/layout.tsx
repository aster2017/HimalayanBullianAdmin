"use client"
import PrelineScript from "@/app/PrelineScript"
import Backtotop from "@/shared/layout-components/backtotop/backtotop"
import Footer from "@/shared/layout-components/footer/footer"
import Header from "@/shared/layout-components/header/header"
import Sidebar from "@/shared/layout-components/sidebar/sidebar"
import Switcher from "@/shared/layout-components/switcher/switcher"
import { ThemeChanger } from "@/shared/redux/action"
import { useAppDispatch, useAppSelector } from "@/shared/redux/hooks"
import { fetchCurrentUser, logout } from "@/shared/redux/authSlice"
import { clearStoredToken, getStoredToken } from "@/shared/utils/tokenStorage"
import store from "@/shared/redux/store"
import { Fragment, useEffect, useState } from "react"
import { connect } from "react-redux"
import { useRouter } from "next/navigation"

const STAFF_ROLES = ['SuperAdmin', 'Admin', 'Manager', 'Staff'];

const Layout = ({children,}:any) => {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const [authChecked, setAuthChecked] = useState(false);
  const [MyclassName, setMyClass] = useState("");

  // VAPT: Privilege Escalation guard — verify the session belongs to a staff user.
  // Runs once on mount to catch tokens manually injected into localStorage after
  // the login flow (which already blocks customers). Handles the page-reload race
  // where Redux user is null until /auth/me returns.
  useEffect(() => {
    const checkAuth = async () => {
      const token = getStoredToken();
      if (!token) {
        router.replace('/');
        return;
      }

      let resolvedUser = user;
      if (!resolvedUser) {
        const result = await dispatch(fetchCurrentUser());
        if (fetchCurrentUser.rejected.match(result)) {
          clearStoredToken();
          router.replace('/');
          return;
        }
        resolvedUser = result.payload as any;
      }

      const isStaff = resolvedUser?.roles?.some((r: string) => STAFF_ROLES.includes(r));
      if (!isStaff) {
        clearStoredToken();
        dispatch(logout());
        router.replace('/');
        return;
      }

      setAuthChecked(true);
    };

    checkAuth();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const Bodyclickk = () => {
    const theme = store.getState() as any;
    if (localStorage.getItem("ynexverticalstyles") == "icontext") {
      setMyClass("");
    }
    if (window.innerWidth > 992) {
      if (theme.iconOverlay === 'open') {
        ThemeChanger({ ...theme, iconOverlay: "" });
      }
    }
  }

  if (!authChecked) return null;

  return (
    <>


    <Fragment>
        <Switcher/>
      <div className='page'>
        <Header/>
        <Sidebar/>
        <div className='content'>
          <div className='main-content'
          onClick={Bodyclickk}
          >
            {children}
          </div>
        </div>
        <Footer/>
      </div>
      <Backtotop/>
      <PrelineScript/>
    </Fragment>
    </>
  )
}

const mapStateToProps = (state: any) => ({
  local_varaiable: state.legacy || state
});

export default connect(mapStateToProps, { ThemeChanger})(Layout);
