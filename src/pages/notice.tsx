import React from 'react';
import Head from 'next/head';
import Header from '@/components/Common/Header';
import Notice from '@/components/Notice';
import Footer from '@/components/Common/Footer';

const NoticePage = () => {

  return (
    <>
      <Head>
        <title>Notice</title>
        <meta name="description" content="Generated by create next app" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <Header />
      <Notice />
      <Footer />
    </>
  )
}

export default NoticePage;