import axios from "axios";
import { useRouter } from "next/router";
import Script from "next/script";
import { useContext, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import TawkTo from "tawkto-react";
import apiRequest from "../../../utils/apiRequest";
import auth from "../../../utils/auth";
import hexToRgb from "../../../utils/hexToRgb";
import languageModel from "../../../utils/languageModel";
import settings from "../../../utils/settings";
import { fetchCart } from "../../store/Cart";
import { fetchCompareProducts } from "../../store/compareProduct";
import { setupAction } from "../../store/websiteSetup";
import { fetchWishlist } from "../../store/wishlistData";
import LoginWidget from "../Auth/Login/LoginWidget";
import SignupWidget from "../Auth/Signup/SignupWidget";
import VerifyWidget from "../Auth/Signup/VerifyWidget";
import LoginContext from "../Contexts/LoginContext";
import Consent from "../Helpers/Consent";
import ServeLangItem from "../Helpers/ServeLangItem";
import MessageWidget from "../MessageWidget";

export default function DefaultLayout({ children }) {
  const router = useRouter();
  const dispatch = useDispatch();
  const getLoginContexts = useContext(LoginContext);
  const { websiteSetup } = useSelector((state) => state.websiteSetup);
  const [twkData, setTwkData] = useState(null);
  const [gtagId, setgTagId] = useState(null);
  const [fbPixexl, setFbPixel] = useState(null);
  const [load, setLoad] = useState(true);
  const [popupView, setPopupView] = useState("login");
  const [messageWid, setMessageWid] = useState(null);
  const apiFetch = () => {
    axios
      .get(`${process.env.NEXT_PUBLIC_BASE_URL}api/website-setup`)
      .then((res) => {
        // handle success
        dispatch(setupAction(res.data));
        localStorage.setItem(
          "settings",
          JSON.stringify(res.data && res.data.setting)
        );
        localStorage.setItem("pusher", JSON.stringify(res.data && res.data.pusher_info ? res.data.pusher_info : null));


        if (res.data) {
          setgTagId(res.data.googleAnalytic.analytic_id);
          setTwkData({
            widgetId: res.data.tawk_setting.widget_id,
            propertyId: res.data.tawk_setting.property_id,
          });
          setFbPixel(res.data.facebookPixel);
          localStorage.setItem("language", JSON.stringify(res.data.language));
          const checkLangExists = localStorage.getItem("language");
          if (checkLangExists) {
            setLoad(false);
            if (!messageWid) {
              if (localStorage.getItem("pusher")) {
                const pusher = JSON.parse(localStorage.getItem("pusher"));
                setMessageWid(pusher);
              }
            }
          }
        }
      })
      .catch((error) => {
        // handle error
        console.log(error);
      });
    dispatch(fetchWishlist());
  };
  useEffect(() => {
    !websiteSetup ? apiFetch() : false;
    dispatch(fetchCart());
    dispatch(fetchCompareProducts());
    const themeColor = JSON.parse(localStorage.getItem('settings'))
    if (themeColor) {
      const root = document.querySelector(':root');
      if (themeColor.theme_one && themeColor.theme_two) {
        root.style.setProperty('--primary-color', `${hexToRgb(themeColor.theme_one)}`);
        root.style.setProperty('--secondary-color', `${hexToRgb(themeColor.theme_two)}`);
      }
    }
    if (languageModel()) {
      setLoad(false);
    }
  }, [websiteSetup, apiFetch, dispatch]);
  useEffect(() => {
    if (twkData) {
      let tawk = new TawkTo(`${twkData.widgetId}`, `${twkData.propertyId}`);
      tawk.onStatusChange((status) => {
        console.log(status);
      });
    }
  }, [twkData]);
  useEffect(() => {
    if (fbPixexl) {
      import("react-facebook-pixel")
        .then((x) => x.default)
        .then((ReactPixel) => {
          ReactPixel.init(`${fbPixexl.app_id}`); // facebookPixelId
          ReactPixel.pageView();

          router.events.on("routeChangeComplete", () => {
            ReactPixel.pageView();
          });
        });
    }
  }, [fbPixexl, router.events]);
  const { text_direction, enable_multivendor } = settings();
  useEffect(() => {
    const html = document.getElementsByTagName("html");
    html[0].dir = text_direction;
  });
  // components actions
  const loginActionPopup = () => {
    setPopupView("signup");
  };
  const notVerifyHandler = () => {
    setPopupView("verify");
  }
  const signupActionPopup = () => {
    setPopupView("login");
  };
  const singupActionHandle = () => {
    setPopupView("verify");
  }
  const verifyActionPopup = () => {
    setPopupView("login");
  };


  useEffect(() => {
    if (getLoginContexts.loginPopup === false) {
      setPopupView("login");
      if (auth()) {
        const holdData = JSON.parse(localStorage.getItem("data-hold"))
        if (holdData && holdData.type === "add-to-cart") {
          if (holdData.variants) {
            const variantQuery = holdData.variants.map((value, index) => {
              return value ? `variants[]=${value}` : `variants[]=-1`;
            });
            const variantString = variantQuery.map((value) => value + "&").join("");
            const itemsQuery = holdData.variantItems.map((value, index) => {
              return value ? `items[]=${value}` : `items[]=-1`;
            });
            const itemQueryStr = itemsQuery.map((value) => value + "&").join("");
            const uri = `token=${auth().access_token}&product_id=${holdData.id}&${variantString}${itemQueryStr}quantity=${holdData.quantity}`;
            apiRequest
              .addToCard(uri)
              .then((res) => {
                toast.success(ServeLangItem()?.Item_added);
                localStorage.removeItem("data-hold");
                router.push("/cart");
              }).catch((err) => {
                console.log(err);
                toast.error(
                  err.response &&
                  err.response.data.message &&
                  err.response.data.message
                );
              });
            dispatch(fetchCart());
          } else {
            const uri = `token=${auth().access_token}&product_id=${holdData.id}&quantity=${holdData.quantity}`;
            apiRequest
              .addToCard(uri)
              .then((res) => {
                toast.success(ServeLangItem()?.Item_added);
                localStorage.removeItem("data-hold");
                router.push("/cart");
              }).catch((err) => {
                console.log(err);
                toast.error(
                  err.response &&
                  err.response.data.message &&
                  err.response.data.message
                );
              });
            dispatch(fetchCart());
          }
        }
      }
    }
  }, [dispatch, getLoginContexts.loginPopup]);

  return (
    <>
      {gtagId && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${gtagId}`}
            strategy="afterInteractive"
          />
          <Script id="google-analytics" strategy="afterInteractive">
            {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){window.dataLayer.push(arguments);}
          gtag('js', new Date());

          gtag('config', '${gtagId}');
        `}
          </Script>
        </>
      )}
      <div className={`relative`}>
        <div>
          {!load && children ? (
            <div>
              <Consent />
              <div>{children}</div>
              {getLoginContexts.loginPopup && (
                <div
                  className={
                    "w-full h-screen fixed left-0 top-0 flex justify-center items-center z-40"
                  }
                >
                  <div className="w-full h-full fixed left-0 top-0 bg-black bg-opacity-50"></div>
                  <div
                    data-aos="fade-up"
                    className={`lg:w-[572px] w-full lg:h-[670px] h-full bg-white flex flex-col justify-center sm:p-10 p-5 border border-[#E0E0E0] relative z-40`}
                  >
                    <div
                      onClick={() => getLoginContexts.handlerPopup(false)}
                      className="absolute right-5 top-5 cursor-pointer"
                    >
                      <svg
                        //width="800px" height="800px"
                        viewBox="0 0 54 54"
                        //style="enable-background:new 0 0 54 54;"
                        //x="0px" y="0px"
                        fill="none"
                        className="cursor-pointer md:w-[54px] md:h-[54px] w-[30px] h-[30px]"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M76.563,490h336.875C455.547,490,490,455.547,490,413.438V76.563C490,34.453,455.547,0,413.437,0H76.563
                          C34.453,0,0,34.453,0,76.563v336.875C0,455.547,34.453,490,76.563,490z M124.835,175.445l50.61-50.611L245,194.39l69.555-69.555
                          l50.61,50.611L295.611,245l69.555,69.555l-50.61,50.611L245,295.611l-69.555,69.555l-50.61-50.61L194.389,245L124.835,175.445z"
                          fill="#F34336"
                        ></path>
                      </svg>
                    </div>
                    {popupView === "login" ? (
                      <LoginWidget
                        redirect={false}
                        loginActionPopup={loginActionPopup}
                        notVerifyHandler={notVerifyHandler}
                      />
                    ) : popupView === "signup" ? (
                      <SignupWidget
                        redirect={false}
                        signupActionPopup={signupActionPopup}
                        changeContent={singupActionHandle}
                      />
                    ) : popupView === "verify" ? (
                      <VerifyWidget
                        redirect={false}
                        verifyActionPopup={verifyActionPopup}
                      />
                    ) : (
                      ""
                    )}
                  </div>
                </div>
              )}
              {parseInt(enable_multivendor) === 1 && messageWid && (
                <MessageWidget pusher={messageWid} />
              )}
            </div>
          ) : (
            <div className="w-full h-full fixed bg-white px-5 py-5">
              <span>
                <svg xmlns="http://www.w3.org/2000/svg" width="38" height="38" viewBox="0 0 38 38" stroke="#FCBB38">
                  <g fill="none" fillRule="evenodd">
                    <g transform="translate(1 1)" strokeWidth="2">
                      <circle strokeOpacity=".5" cx="18" cy="18" r="18" />
                      <path d="M36 18c0-9.94-8.06-18-18-18">
                        <animateTransform attributeName="transform" type="rotate" from="0 18 18" to="360 18 18" dur="1s" repeatCount="indefinite" />
                      </path>
                    </g>
                  </g>
                </svg>
              </span>
            </div>
          )}
        </div>
      </div>
      {/*<LoginContext.Consumer>*/}
      {/*  {({ loginPopup, handlerPopup }) => (*/}
      {/*   */}
      {/*  )}*/}
      {/*</LoginContext.Consumer>*/}
    </>
  );
}
