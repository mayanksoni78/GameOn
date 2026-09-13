import React from 'react';
import { ScrollViewStyleReset } from 'expo-router/html';
import { type PropsWithChildren } from 'react';

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
        <ScrollViewStyleReset />
        <style dangerouslySetInnerHTML={{ __html: `
          html, body, #root {
            background-color: #09080E !important;
            color-scheme: dark !important;
            color: #F4F4F5;
            margin: 0;
            padding: 0;
            width: 100%;
            height: 100%;
            overflow-x: hidden;
            -webkit-tap-highlight-color: transparent;
          }
          * {
            box-sizing: border-box;
          }
        ` }} />
      </head>
      <body style={{ backgroundColor: '#09080E', margin: 0, padding: 0 }}>{children}</body>
    </html>
  );
}
