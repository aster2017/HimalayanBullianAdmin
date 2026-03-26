import Link from "next/link";
import React, { Fragment } from "react";

const Footer = () => {
    const currentYear = new Date().getFullYear();

    return (
        <Fragment>
            <footer className="footer mt-auto xl:ps-[15rem] font-normal font-inter bg-white text-defaultsize leading-normal text-[0.813] shadow-[0_0_0.4rem_rgba(0,0,0,0.1)] dark:bg-bodybg py-4 text-center">
                <div className="container">
                    <div className="flex flex-col gap-2 items-center justify-center">
                        <span className="text-gray dark:text-defaulttextcolor/50">
                            Copyright © <span id="year">{currentYear}</span>
                            <span className="font-semibold text-defaulttextcolor dark:text-defaulttextcolor ms-1">
                                HBC Himalayan Bullion
                            </span>
                            . All rights reserved.
                        </span>
                        <span className="text-gray dark:text-defaulttextcolor/50 text-xs">
                            Jewelry Management System
                        </span>
                    </div>
                </div>
            </footer>
        </Fragment>
    );
};

export default Footer;
