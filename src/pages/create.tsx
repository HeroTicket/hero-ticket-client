import React from 'react';
import Head from 'next/head';
import Header from '@/components/Common/Header';
import CreateTicket from '@/components/CreateTicket';

const CreateTicketPage = () => {
  return (
    <>
      <Head>
        <title>Create Ticket</title>
        <meta name="description" content="Generated by create next app" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <Header />
      <CreateTicket />
    </>
  )
}

export default CreateTicketPage;