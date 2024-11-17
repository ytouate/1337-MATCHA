import "./globals.css";
import React from "react";
import { AppProps } from "next/app";

const Matcha = ({ Component, pageProps }: AppProps) => {
  return <Component {...pageProps} />;
};

export default Matcha;
