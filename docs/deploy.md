# Deploy guide

This guide shows how to put the Trening app on the test server. It lists every step on the server and in GitHub. Follow the steps in order.

The app runs at `https://trening.marcinlukaszek.pl/`. This is a test release. Small bugs are acceptable.

## Placeholders

The repository is public. This guide holds no private value. Replace these placeholders with your own values.

| Placeholder | Meaning |
|---|---|
| `<SERVER_IP>` | The IP address of your server |
| `<admin-user>` | Your admin user on the server (it has `sudo`) |
| `<deploy-user>` | The new user that only GitHub uses. Choose a name, for example `trening-deploy` |
| `<your-email>` | Your e-mail for Let's Encrypt. Let's Encrypt sends expiry warnings to it |
| `<basic-user>` | The user name for the app login in the browser. Choose a name |
| `<github-user>` | Your GitHub user name. It is `marcinLuk` for this repository |

The password for `<basic-user>` is a secret. Type it only in the terminal when a command asks for it. Never write it in a file in the repository.

## 1. How the parts connect

```text
git push to main
  -> GitHub Actions  (.github/workflows/deploy.yml)
       job test:   npm ci, npm test, npm run build, node scripts/verify-dist.mjs dist
       job image:  bash scripts/smoke-image.sh, then push ghcr.io/marcinluk/training:<sha> and :latest
       job deploy: only if the variable DEPLOY_ENABLED is 'true'
  -> SSH to <deploy-user>@<SERVER_IP> with the deploy key
  -> forced command: sudo /opt/trening/deploy.sh <sha>
  -> docker compose pull + up -d  (/opt/trening/compose.yaml)
  -> Traefik (/opt/traefik/compose.yaml): TLS from Let's Encrypt + Basic auth
  -> nginx in the app container (Dockerfile, deploy/nginx/default.conf), port 8080
```

Facts about the parts:

- Only Traefik publishes ports on the server (80 and 443). The app container publishes no port.
- Traefik and the app talk on the Docker network `traefik`.
- Basic auth runs in Traefik. The image has no Basic auth.
- The deploy key can run only `deploy.sh`. It cannot open a shell.
- `deploy.sh` accepts only a 40-character lowercase commit SHA.

## 2. What is in the repository and what is only on the server

In the repository:

| File | Use |
|---|---|
| `Dockerfile` | Builds the app and the nginx image. The container user is `101`, the port is `8080` |
| `.dockerignore` | Keeps local files out of the image build |
| `.gitattributes` | Forces LF line endings for scripts and config files |
| `deploy/nginx/default.conf` | nginx rules: cache headers, MIME type for `.webmanifest`, real 404 |
| `deploy/nginx/security-headers.conf` | Security headers that nginx adds in every location |
| `deploy/compose.yaml` | The app service and its Traefik labels. Copy it to `/opt/trening/compose.yaml` |
| `deploy/traefik/compose.yaml` | The Traefik service. Copy it to `/opt/traefik/compose.yaml` |
| `deploy/server/deploy.sh` | The deploy script. Copy it to `/opt/trening/deploy.sh` |
| `deploy/server/deploy.test.sh` | Tests for `deploy.sh` (run on your computer) |
| `scripts/smoke-image.sh` | Builds the image and tests it (run on your computer and in CI) |
| `scripts/verify-dist.mjs` | Checks the build output for the PWA rules |
| `.github/workflows/deploy.yml` | The CI and deploy workflow |

Only on the server (never in git):

| Path or value | Use |
|---|---|
| `/opt/traefik/.env` | `ACME_EMAIL=<your-email>` |
| `/opt/traefik/auth/users` | The Basic auth users file (made with `htpasswd -nB`) |
| `/opt/traefik/letsencrypt/acme.json` | The certificate store. File mode 600 |
| `/opt/trening/.env` | `TRENING_TAG=<sha>`. Only `deploy.sh` writes it |

The private deploy key lives on your computer and in the GitHub secret `DEPLOY_SSH_KEY`. It is not on the server. The server holds only the public key.

## 3. Before you start

You need:

- A computer with `git`, `ssh`, `scp`, `ssh-keygen`, and the GitHub CLI `gh`. Run `gh auth login` once.
- SSH access to the server as `<admin-user>`. The server runs Ubuntu Server 24.04. Key-only SSH, `ufw` (ports 22, 80 and 443 open) and an `AllowUsers` list are already set. Docker is not installed.
- Access to the DNS panel of `marcinlukaszek.pl` at your registrar.
- Access to the console of the server at your hosting provider (a web console). You use it once, to check the host key.

Run this on your computer, in the repository folder. It proves that the files are sound:

```bash
npm test
npm run build
node scripts/verify-dist.mjs dist
bash scripts/smoke-image.sh
bash deploy/server/deploy.test.sh
```

You should see no `FAIL` line. Each command exits with code 0. The smoke test needs Docker on your computer. If you do not have Docker, skip `bash scripts/smoke-image.sh`. CI runs it too.

Check that the files have LF line endings. The command must print `0` for each file.

```bash
grep -c $'\r' deploy/server/deploy.sh deploy/compose.yaml deploy/traefik/compose.yaml deploy/nginx/default.conf
```

## 4. One-time server setup

Do these steps once. Work in order.

### Step 1. Add the DNS record

1. Open the DNS panel of `marcinlukaszek.pl` at your registrar.
2. Add an `A` record: name `trening`, value `<SERVER_IP>`.
3. Wait a few minutes. Then check it on your computer:

```bash
getent hosts trening.marcinlukaszek.pl
```

You should see `<SERVER_IP>` in the output. If the output is empty, wait and try again. Do not go on until the record works. Let's Encrypt needs it.

### Step 2. Log in to the server

```bash
ssh <admin-user>@<SERVER_IP>
```

Run the commands of steps 3 to 10 on the server, unless the step says "on your computer".

### Step 3. Install Docker Engine and the compose plugin

These commands come from the Docker documentation for Ubuntu (apt repository).

```bash
sudo apt update
sudo apt install ca-certificates curl
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc

sudo tee /etc/apt/sources.list.d/docker.sources <<EOF
Types: deb
URIs: https://download.docker.com/linux/ubuntu
Suites: $(. /etc/os-release && echo "${UBUNTU_CODENAME:-$VERSION_CODENAME}")
Components: stable
Architectures: $(dpkg --print-architecture)
Signed-By: /etc/apt/keyrings/docker.asc
EOF

sudo apt update
sudo apt install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

Check the install:

```bash
sudo docker run --rm hello-world
sudo docker compose version
```

You should see "Hello from Docker!" and a compose version line.

Do not add `<admin-user>` to the `docker` group. A member of that group has root rights. Use `sudo docker ...`.

### Step 4. Check `ufw`

Docker writes its own firewall rules. A container port that Docker publishes bypasses `ufw`. So the rule is: only Traefik publishes ports. Never add a `ports:` entry to the app service.

`ufw` must allow ports 22, 80 and 443. Check it:

```bash
sudo ufw status
```

You should see `22`, `80` and `443` as `ALLOW`. Do not change `ufw` for the app.

### Step 5. Create the Docker network

```bash
sudo docker network create traefik
sudo docker network ls --filter name=traefik
```

You should see one network with the name `traefik`. Both compose files use it as an external network.

### Step 6. Set up Traefik

1. On your computer, in the repository folder, copy the compose file to the home folder of `<admin-user>` on the server:

```bash
scp deploy/traefik/compose.yaml <admin-user>@<SERVER_IP>:traefik-compose.yaml
```

2. On the server, make the folders and files:

```bash
sudo install -d -m 755 /opt/traefik
sudo install -d -m 755 /opt/traefik/letsencrypt
sudo install -d -m 700 /opt/traefik/auth
sudo install -m 644 ~/traefik-compose.yaml /opt/traefik/compose.yaml
rm ~/traefik-compose.yaml
sudo install -m 600 /dev/null /opt/traefik/letsencrypt/acme.json
```

The file `acme.json` must have mode 600. Traefik refuses to use a certificate file that other users can read.

3. Write the e-mail for Let's Encrypt. Replace `<your-email>` with your e-mail:

```bash
printf 'ACME_EMAIL=%s\n' '<your-email>' | sudo tee /opt/traefik/.env >/dev/null
sudo chmod 600 /opt/traefik/.env
```

4. Make the Basic auth users file. The file name must be `auth/users`, because the app labels in `deploy/compose.yaml` point at `/etc/traefik/auth/users`. Replace `<basic-user>`:

```bash
read -rs -p 'Basic auth password: ' BASIC_PW; echo
printf '%s' "$BASIC_PW" | sudo docker run --rm -i httpd:2.4-alpine htpasswd -nBi '<basic-user>' | sudo tee /opt/traefik/auth/users >/dev/null
unset BASIC_PW
sudo chmod 600 /opt/traefik/auth/users
```

The `htpasswd -nB` command makes one bcrypt line: `<basic-user>:$2y$...`. The option `-i` reads the password from the input. Traefik reads this file format. Do not change the `$` signs in this file. Only a hash inside a compose label needs `$$`, and this setup has no hash in a label.

Check the file. The command prints the user name and not the hash:

```bash
sudo cut -d: -f1 /opt/traefik/auth/users
```

You should see `<basic-user>`. To add or change a user later, edit this file. Then run `sudo docker compose -f /opt/traefik/compose.yaml restart traefik`.

5. Start Traefik:

```bash
cd /opt/traefik
sudo docker compose up -d
sudo docker compose ps
```

You should see the service `traefik` with the state `running`. If the command fails with "Set ACME_EMAIL in the server-side .env file", the file `/opt/traefik/.env` is missing or empty.

Check the ports. Only Traefik may publish ports:

```bash
sudo docker ps --format 'table {{.Names}}\t{{.Ports}}'
```

You should see the ports `80` and `443` on the Traefik container only.

### Step 7. Check that Traefik answers

On your computer:

```bash
curl -I http://trening.marcinlukaszek.pl/
```

You should see a redirect (status 301 or 308) with a `location: https://trening.marcinlukaszek.pl/` header. This proves that the DNS record, port 80 and Traefik work.

Traefik asks Let's Encrypt for the certificate when the app runs for the first time (step 17). Until then, a request to `https://` gives a certificate warning and a `404`. This is normal.

### Step 8. Set up the app folder

1. On your computer, copy the two files:

```bash
scp deploy/compose.yaml <admin-user>@<SERVER_IP>:app-compose.yaml
scp deploy/server/deploy.sh <admin-user>@<SERVER_IP>:deploy.sh
```

2. On the server:

```bash
sudo install -d -m 755 -o root -g root /opt/trening
sudo install -m 644 -o root -g root ~/app-compose.yaml /opt/trening/compose.yaml
sudo install -m 755 -o root -g root ~/deploy.sh /opt/trening/deploy.sh
rm ~/app-compose.yaml ~/deploy.sh
ls -l /opt/trening
```

You should see `compose.yaml` and `deploy.sh`, both owned by `root root`. The deploy user must not be able to write in `/opt/trening` or change `deploy.sh`. The script runs as root.

### Step 9. Make the deploy key (on your computer)

```bash
ssh-keygen -t ed25519 -f ~/.ssh/trening_deploy -C trening-deploy -N ""
cat ~/.ssh/trening_deploy.pub
```

You get two files. The private key `~/.ssh/trening_deploy` goes to GitHub later. The public key `~/.ssh/trening_deploy.pub` goes to the server now. Copy the line that `cat` prints. It starts with `ssh-ed25519`.

The key has no passphrase, because CI cannot type one. Never commit the private key. Never send it by e-mail or chat.

### Step 10. Make the deploy user (on the server)

1. Make the user. It has no password:

```bash
sudo adduser --disabled-password --gecos "" <deploy-user>
```

2. Make the `.ssh` folder and the `authorized_keys` file. Both belong to root, so the deploy user cannot change them. In the second command, replace the text `ssh-ed25519 AAAA... trening-deploy` with the public key line from step 9. Keep everything before it.

```bash
sudo install -d -m 755 -o root -g root /home/<deploy-user>/.ssh
sudo tee /home/<deploy-user>/.ssh/authorized_keys >/dev/null <<'EOF'
command="sudo /opt/trening/deploy.sh \"$SSH_ORIGINAL_COMMAND\"",restrict,no-pty,no-port-forwarding,no-agent-forwarding,no-X11-forwarding ssh-ed25519 AAAA... trening-deploy
EOF
sudo chmod 644 /home/<deploy-user>/.ssh/authorized_keys
sudo chown root:root /home/<deploy-user>/.ssh/authorized_keys
```

What the options do:

- `command="..."` makes sshd run this command for the key. sshd ignores the command that the client sends.
- sshd puts the command that the client sent into `$SSH_ORIGINAL_COMMAND`. GitHub sends the commit SHA there.
- The quotes around `$SSH_ORIGINAL_COMMAND` keep it as one argument. The shell cannot split it or run a second command. Then `deploy.sh` checks that it is a 40-character lowercase hex SHA.
- `restrict` switches off all extra features. The other four options repeat the most important ones: no terminal, no port forwarding, no agent forwarding, no X11 forwarding.

3. Make the `sudoers` rule. It lets the deploy user run only `deploy.sh`, as root. Write it to a temporary file and check it first:

```bash
echo '<deploy-user> ALL=(root) NOPASSWD: /opt/trening/deploy.sh *' > ~/trening-deploy.sudoers
sudo visudo -cf ~/trening-deploy.sudoers
```

You should see `parsed OK`. Then install it:

```bash
sudo install -m 440 -o root -g root ~/trening-deploy.sudoers /etc/sudoers.d/trening-deploy
rm ~/trening-deploy.sudoers
sudo visudo -c
sudo -l -U <deploy-user>
```

You should see `parsed OK` for each file, and one allowed command: `/opt/trening/deploy.sh *`.

Two rules for this file:

- Keep the default `env_reset`. Do not add `Defaults !env_reset`.
- Do not add `SETENV`. `deploy.sh` reads `TRENING_DIR` from its environment. If the deploy user could set it, the user could point the script at other files. Without `SETENV`, `deploy.sh` uses its default `/opt/trening`.

4. Add the user to `AllowUsers`. Find where your SSH server config sets it:

```bash
sudo grep -rn '^ *AllowUsers' /etc/ssh/sshd_config /etc/ssh/sshd_config.d/
```

Open that file with `sudo nano <file>`. Add `<deploy-user>` to the end of the `AllowUsers` line, after a space. Do not remove `<admin-user>`. Then check the config and reload:

```bash
sudo sshd -t
sudo systemctl reload ssh
sudo sshd -T | grep -i '^allowusers'
```

`sshd -t` prints nothing when the config is valid. The last command must list both users. Keep your current SSH session open. Test a new login in step 11 before you close it.

### Step 11. Test the SSH deploy path (on your computer)

Send a bad argument. `deploy.sh` must refuse it:

```bash
ssh -i ~/.ssh/trening_deploy -o IdentitiesOnly=yes <deploy-user>@<SERVER_IP> "not-a-sha"; echo "exit code: $?"
```

You should see `deploy: refused: the tag must be a 40-character lowercase hex commit SHA` and `exit code: 2`. This proves that the key works, the forced command runs, and `sudo` works without a password.

Now send a valid but unknown SHA. The image does not exist yet, so the pull must fail:

```bash
ssh -i ~/.ssh/trening_deploy -o IdentitiesOnly=yes <deploy-user>@<SERVER_IP> "0000000000000000000000000000000000000000"; echo "exit code: $?"
```

You should see `deploy: pulling image tag 0000...`, then an error from Docker (the image is not found, or access is denied), and a non-zero exit code. A failed pull does not change `/opt/trening/.env`.

Try to run a normal command with the key. It must not run:

```bash
ssh -i ~/.ssh/trening_deploy -o IdentitiesOnly=yes <deploy-user>@<SERVER_IP> "id"; echo "exit code: $?"
```

You should see the refusal from `deploy.sh` again. The command `id` never runs.

The server setup is done.

## 5. GitHub setup

### Step 12. Get the host key line safely

GitHub must know the host key of your server. If it does not, the deploy job refuses to connect. This is on purpose. A wrong key would mean a different server.

Do not trust the network blindly. Compare the fingerprint with the one that the server shows on its own console.

1. On your computer, fetch the host key into a file:

```bash
ssh-keyscan -t ed25519 <SERVER_IP> > ~/trening_known_hosts
cat ~/trening_known_hosts
ssh-keygen -lf ~/trening_known_hosts
```

The second command prints one line that starts with `<SERVER_IP> ssh-ed25519`. The third command prints the fingerprint, for example `256 SHA256:... <SERVER_IP> (ED25519)`.

2. Open the web console of your server at your hosting provider. Log in. Run:

```bash
ssh-keygen -lf /etc/ssh/ssh_host_ed25519_key.pub
```

3. Compare the two `SHA256:...` strings. They must be the same, character by character. If they differ, stop. Do not use the file. Find the reason first.

### Step 13. Set the repository secrets

The workflow uses four secrets. The names are fixed in `.github/workflows/deploy.yml`.

| Secret | Value |
|---|---|
| `DEPLOY_HOST` | `<SERVER_IP>`. Use the same text that you gave to `ssh-keyscan` |
| `DEPLOY_USER` | `<deploy-user>` |
| `DEPLOY_SSH_KEY` | The private key file `~/.ssh/trening_deploy` |
| `DEPLOY_KNOWN_HOSTS` | The file `~/trening_known_hosts` from step 12 |

Run these on your computer:

```bash
gh secret set DEPLOY_HOST --repo marcinLuk/training --body '<SERVER_IP>'
gh secret set DEPLOY_USER --repo marcinLuk/training --body '<deploy-user>'
gh secret set DEPLOY_SSH_KEY --repo marcinLuk/training < ~/.ssh/trening_deploy
gh secret set DEPLOY_KNOWN_HOSTS --repo marcinLuk/training < ~/trening_known_hosts
gh secret list --repo marcinLuk/training
```

If you give no `--body`, `gh` reads the value from standard input. The last command must list the four names. GitHub never shows a secret value again.

After this, you can delete `~/trening_known_hosts`. Keep the private key `~/.ssh/trening_deploy` in a safe place, or make a new key later.

### Step 14. Do not set `DEPLOY_ENABLED` yet

The variable `DEPLOY_ENABLED` is a switch. The deploy job runs only when the variable is exactly `true`.

Do not set it before the first push. The first image does not exist yet. A new image in GHCR is private, so the server cannot pull it until you make it public (step 16). Set the variable in step 17.

## 6. First release

### Step 15. Push

This step is your own action. Push the `main` branch:

```bash
git push origin main
```

Watch the run in the Actions tab of the repository, or run `gh run watch --repo marcinLuk/training`. The first run does this:

1. Job `test`: `npm ci`, `npm test`, `npm run build`, `node scripts/verify-dist.mjs dist`.
2. Job `image`: `bash scripts/smoke-image.sh`, then it pushes `ghcr.io/marcinluk/training:<sha>` and `ghcr.io/marcinluk/training:latest`.
3. Job `deploy`: it is skipped, because `DEPLOY_ENABLED` is not set. A skipped job is correct here.

### Step 16. Make the image public

GitHub sets a new container package to private. The server must pull the image. You have two options. Option A is simpler.

**Option A. Make the package public.**

1. Open `https://github.com/marcinLuk?tab=packages` and click the package `training`.
2. Click `Package settings` in the right sidebar.
3. At the bottom, in the "Danger Zone", click `Change visibility`. Select `Public`.
4. Type the package name to confirm.

You cannot make the package private again. The code is public anyway. The image holds only the built app.

Check it from your computer. The pull needs no login:

```bash
docker pull ghcr.io/marcinluk/training:latest
```

**Option B. Keep the package private.** Make a personal access token (classic) in GitHub with the single scope `read:packages`. On the server, log in as root. `deploy.sh` runs as root, so root needs the login:

```bash
read -rs -p 'GitHub token: ' CR_PAT; echo
printf '%s' "$CR_PAT" | sudo -H docker login ghcr.io -u <github-user> --password-stdin
unset CR_PAT
```

Then test the full path with a real SHA (see "Rollback to an older version"). Do not use a token with more rights.

### Step 17. Turn on the deploy job and run it

1. Set the variable:

```bash
gh variable set DEPLOY_ENABLED --repo marcinLuk/training --body true
gh variable list --repo marcinLuk/training
```

2. Run the workflow again on `main`. The run builds and pushes the image again, then it deploys:

```bash
gh workflow run deploy.yml --repo marcinLuk/training --ref main
gh run watch --repo marcinLuk/training
```

All three jobs must end green. In the log of the `deploy` job you should see the `deploy:` lines of `deploy.sh`: pulling, storing `TRENING_TAG`, restarting, done. The job never prints a secret.

On the server, check the result:

```bash
sudo cat /opt/trening/.env
sudo docker ps --format 'table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}'
```

You should see `TRENING_TAG=<40-character SHA>`. You should see the container `trening-app-1` with an image tag equal to that SHA. The app container has no published port.

The first HTTPS request makes Traefik ask Let's Encrypt for the certificate. Wait about one minute for the first answer.

## 7. Checks after the release

Run these on your computer. Each `curl` with `-u` asks for the Basic auth password.

**No credentials give 401:**

```bash
curl -I https://trening.marcinlukaszek.pl/
```

Expected: `HTTP/2 401` and a `www-authenticate: Basic` header.

**The app page:**

```bash
curl -I -u <basic-user> https://trening.marcinlukaszek.pl/
```

Expected headers (from `deploy/nginx/default.conf` and `deploy/nginx/security-headers.conf`):

- `HTTP/2 200`
- `cache-control: no-cache`
- `x-robots-tag: noindex, nofollow`
- `x-content-type-options: nosniff`
- `referrer-policy: no-referrer`
- `content-security-policy: default-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'`
- `permissions-policy: screen-wake-lock=(self), camera=(), ...` (all other listed features are off)
- `strict-transport-security: max-age=31536000`
- `server: nginx` (no version number)

The browser now remembers for one year to use only HTTPS for this address (HSTS). If you ever stop serving the app over HTTPS, the browser refuses to open it until this time ends.

**The manifest:**

```bash
curl -I -u <basic-user> https://trening.marcinlukaszek.pl/manifest.webmanifest
```

Expected: status `200`, `content-type: application/manifest+json`, `cache-control: no-cache`.

**The service worker:**

```bash
curl -I -u <basic-user> https://trening.marcinlukaszek.pl/sw.js
```

Expected: status `200`, a JavaScript `content-type`, `cache-control: no-cache`.

**A hashed asset.** The first command finds the path of one JavaScript file and keeps it in `ASSET`. The path already starts with `/assets/`. The second command adds it to the address:

```bash
ASSET=$(curl -s -u <basic-user> https://trening.marcinlukaszek.pl/ | grep -o '/assets/[^"]*\.js' | head -n 1)
echo "$ASSET"
curl -I -u <basic-user> "https://trening.marcinlukaszek.pl$ASSET"
```

The `echo` line shows a path such as `/assets/index-<hash>.js`. If it shows nothing, the first command did not get the page (check the password).

Expected: status `200`, `cache-control: public, max-age=31536000, immutable`.

**A missing file is a real 404:**

```bash
curl -I -u <basic-user> https://trening.marcinlukaszek.pl/does-not-exist.js
```

Expected: `HTTP/2 404`.

**Port 80 redirects to HTTPS:**

```bash
curl -I http://trening.marcinlukaszek.pl/
```

Expected: a redirect (301 or 308) to `https://trening.marcinlukaszek.pl/`.

**Install on the phone (Android, Chrome):**

1. Open `https://trening.marcinlukaszek.pl/` in a normal Chrome tab. Log in with the Basic auth user. Use the app for about 30 seconds and tap once. Chrome needs this before it offers the install.
2. Open the Chrome menu and choose "Install app" (or "Add to Home screen" if you see only that).
3. Open `chrome://webapks` in Chrome. You should see an entry for "Trening". A WebAPK entry means a real install. If you see no entry, Chrome made only a shortcut (see section 9).
4. Open the app from the home screen. It opens without the browser bar.
5. Test the offline start. Open the app once with network. Close it. Turn on airplane mode. Open the app from the home screen. You should see the plan list in the normal fonts. You can save a plan and start a workout.

## 8. Daily use

- Merge to `main` (or push to `main`). The workflow runs `test`, then `image`, then `deploy`. No manual step is needed.
- Every push to `main` makes an image with the tag of the full commit SHA.
- If the `test` job fails, no image is pushed and nothing is deployed.
- To deploy the current `main` again without a new commit, run `gh workflow run deploy.yml --repo marcinLuk/training --ref main`.
- To stop automatic deploys, delete the variable: `gh variable delete DEPLOY_ENABLED --repo marcinLuk/training`. The `test` and `image` jobs still run.

### When the server files change

The workflow sends only a new image to the server. It does not copy files. The server keeps its own copies of three files from the repository:

| Repository file | Copy on the server |
|---|---|
| `deploy/compose.yaml` | `/opt/trening/compose.yaml` |
| `deploy/server/deploy.sh` | `/opt/trening/deploy.sh` |
| `deploy/traefik/compose.yaml` | `/opt/traefik/compose.yaml` |

When a commit changes one of these files, copy it to the server again. Do this **before** you push that commit. Then the deploy of that commit uses the new files.

1. On your computer, see which of the files changed since the last push:

```bash
git fetch origin
git diff --stat origin/main..main -- deploy/compose.yaml deploy/server/deploy.sh deploy/traefik/compose.yaml
```

If the command shows nothing, stop here. The server files are up to date.

2. On your computer, copy only the files that changed:

```bash
scp deploy/compose.yaml <admin-user>@<SERVER_IP>:app-compose.yaml
scp deploy/server/deploy.sh <admin-user>@<SERVER_IP>:deploy.sh
scp deploy/traefik/compose.yaml <admin-user>@<SERVER_IP>:traefik-compose.yaml
```

3. On the server, install them with the same owner and mode as in step 6 and step 8. Run only the lines for the files that you copied:

```bash
sudo install -m 644 -o root -g root ~/app-compose.yaml /opt/trening/compose.yaml
sudo install -m 755 -o root -g root ~/deploy.sh /opt/trening/deploy.sh
sudo install -m 644 -o root -g root ~/traefik-compose.yaml /opt/traefik/compose.yaml
rm -f ~/app-compose.yaml ~/deploy.sh ~/traefik-compose.yaml
ls -l /opt/trening /opt/traefik
```

You should see the files owned by `root root`. `deploy.sh` must have mode `rwxr-xr-x`, and the deploy user must not be able to write it.

4. If the Traefik file changed, apply it now:

```bash
cd /opt/traefik
sudo docker compose up -d
sudo docker compose ps
```

You should see the service `traefik` with the state `running`.

5. Push the commit. The next deploy runs the new `deploy.sh`, and it starts the app with the new `compose.yaml`.

If you already pushed and the deploy ran with the old files, do steps 2 and 3, then apply the app file with the tag that runs now:

```bash
sudo cat /opt/trening/.env
sudo /opt/trening/deploy.sh <the-40-character-sha-from-.env>
```

### Rollback to an older version

`deploy.sh` accepts only a full 40-character commit SHA. It does not accept `latest`.

1. Find a SHA. An image exists only for a commit that the workflow built on `main`. You have two ways:
   - On your computer: `git log --format='%H %s' -n 20 main`
   - In GitHub: open the package `training` (`https://github.com/marcinLuk?tab=packages`). The version list shows the tags. A tag with 40 characters is a SHA that you can deploy.
2. Log in as the admin and run `deploy.sh` with that SHA:

```bash
ssh <admin-user>@<SERVER_IP>
sudo /opt/trening/deploy.sh <40-character-sha>
```

You should see `deploy: done, the app runs image tag <sha>`. Check it with `sudo cat /opt/trening/.env`.

3. The next push to `main` deploys the newest version again.

If the pull fails, `deploy.sh` stops and keeps the old tag. The old app keeps running.

### How updates reach the installed app

- A new version installs in the background. The user sees no message.
- The app applies the update and reloads only when the plan list is on screen and no workout runs (see `src/pwa/useServiceWorkerUpdates.ts`). In a workout, in the plan editor or on the end screen, the update waits.
- The app checks for a new version each time it becomes visible again (for example, when you unlock the phone).
- The page, `sw.js` and `manifest.webmanifest` have `cache-control: no-cache`, so Chrome sees a new version fast.

### The Basic auth caveat

Chrome keeps the Basic auth login only in memory. Android often stops the Chrome process. After that, the check for a new `sw.js` gets a `401` and shows no login dialog. The app opens and works, but it stays on the old version.

The workaround:

1. Open `https://trening.marcinlukaszek.pl/` in a normal Chrome tab.
2. Log in when Chrome asks.
3. Open the installed app again. It updates at the next safe moment.

The manifest link in `index.html` uses `crossorigin="use-credentials"` (set with `useCredentials: true` in `vite.config.ts`). So Chrome sends the login with the manifest request.

## 9. Troubleshooting

| Problem | Likely cause | What to do |
|---|---|---|
| The certificate is not issued. The browser shows a certificate warning for a long time | The DNS record is missing or wrong. Port 80 is blocked. `acme.json` has the wrong mode. A Let's Encrypt rate limit | Run `getent hosts trening.marcinlukaszek.pl`. Run `curl -I http://trening.marcinlukaszek.pl/`. Run `sudo ls -l /opt/traefik/letsencrypt/acme.json` (it must show `-rw-------`). Read the log: `sudo docker compose -f /opt/traefik/compose.yaml logs traefik`. Wait one hour if the log names a rate limit |
| `Set ACME_EMAIL in the server-side .env file` | `/opt/traefik/.env` is missing or empty | Repeat step 6, part 3 |
| `401` on the manifest, or the app installs only as a shortcut | You were not logged in when you installed. Or the manifest request had no login | Log in in a normal Chrome tab first. Remove the shortcut. Install again. Check `chrome://webapks`. Check that `curl -I -u <basic-user> https://trening.marcinlukaszek.pl/manifest.webmanifest` gives `200` |
| `401` for the right password | The users file is wrong or not read | Run `sudo cut -d: -f1 /opt/traefik/auth/users`. Make the file again (step 6, part 4). Then run `sudo docker compose -f /opt/traefik/compose.yaml restart traefik` |
| Image pull denied, or `manifest unknown` | The package is still private. Or the SHA has no image | Make the package public (step 16), or log in with a token on the server. Check that the SHA is from a push to `main` that passed the `image` job |
| The `deploy` job is skipped | `DEPLOY_ENABLED` is not `true`. Or the run is not on `main`. Or the `image` job failed | Run `gh variable list --repo marcinLuk/training`. Read the run in the Actions tab |
| `Permission denied (publickey)` in the deploy job or in step 11 | The key does not match. The line in `authorized_keys` is wrong. `<deploy-user>` is not in `AllowUsers` | Run `sudo sshd -T \| grep -i '^allowusers'`. Run `sudo journalctl -u ssh -n 50`. Check the public key line in `/home/<deploy-user>/.ssh/authorized_keys`. Check the secrets `DEPLOY_USER` and `DEPLOY_SSH_KEY` |
| `Host key verification failed` in the deploy job | `DEPLOY_KNOWN_HOSTS` does not match `DEPLOY_HOST` | Make the known_hosts file again with the same host text as `DEPLOY_HOST` (step 12). Set the secret again |
| `sudo: a password is required` in step 11 | The `sudoers` rule is missing or wrong | Run `sudo -l -U <deploy-user>`. Repeat step 10, part 3 |
| `port is already allocated`, or Traefik does not start | Another program uses port 80 or 443 | Run `sudo ss -tlnp \| grep -E ':(80\|443) '`. Stop that program (for example `sudo systemctl disable --now apache2 nginx`). Start Traefik again |
| `bad interpreter: /usr/bin/env bash^M`, or an nginx config error | A file has CRLF line endings | Run `grep -c $'\r' <file>`. If the result is not `0`, fix it: `sed -i 's/\r$//' <file>`. Copy the file to the server again. `.gitattributes` prevents this in new checkouts |
| Traefik answers `404` for the app | The app container is not running. Or it is not on the network `traefik` | Run `sudo docker ps`. Run `sudo docker network inspect traefik`. Run `sudo docker compose -f /opt/trening/compose.yaml up -d` |
| The app works but does not update | The Basic auth login is gone | Use the workaround in section 8 |

## 10. Security notes

- **Docker socket.** Traefik mounts `/var/run/docker.sock` read-only. A program with access to the socket can see all containers and the secrets in them. Even read-only access is a strong right. Run only the pinned Traefik image. Do not mount the socket in other containers.
- **Docker bypasses `ufw`.** A published container port is open to the internet, whatever `ufw` says. Only Traefik publishes ports (80 and 443). The app service has no `ports:`. Check this with `sudo docker ps` after each change.
- **The deploy key can run only `deploy.sh`.** The forced command, `restrict` and the narrow `sudoers` rule limit it. `/opt/trening` and `deploy.sh` belong to root. The deploy user cannot change them. The `sudoers` rule keeps `env_reset` and grants no `SETENV`.
- **`deploy.sh` trusts nothing.** It accepts one argument. The argument must match `^[0-9a-f]{40}$`. It never runs its input.
- **No Basic auth in the image.** Traefik applies it. The users file stays on the server.
- **Never commit secrets.** The repository is public. Do not commit the private key, the users file, `.env` files, passwords, your e-mail, the server IP address or the admin user name. Use the placeholders of this guide in all docs.
- **Rotate the deploy key** if it leaks: make a new key (step 9), replace the line in `authorized_keys` (step 10), and set the secret `DEPLOY_SSH_KEY` again.
- **Host key.** GitHub connects only to the host key in `DEPLOY_KNOWN_HOSTS` (`StrictHostKeyChecking=yes`). Compare the fingerprint on the server console, as in step 12.
