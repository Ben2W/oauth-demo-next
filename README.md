## Getting Started

First, install the packages:

```bash
pnpm install
```

Second, create a clerk OAuth Application and add the environment variables to a `.env.local` file in the root fo the directory

```bash
NEXT_PUBLIC_REDIRECT_URI=http://localhost:3021/callback
NEXT_PUBLIC_CLIENT_ID=<oauth application client id>
NEXT_PUBLIC_CLIENT_SECRET=<oauth application client secret>
NEXT_PUBLIC_FAPI_URL=<clerk instance fapi URL>
```

> View .env.example to see an example

Lastly, run the server

```bash
pnpm dev
```

Open [http://localhost:3021](http://localhost:3021) with your browser to see the demo site.
