# RUN PARTYGOEM

A tetris which can be played with mobile phones. Made for the wedding of Lisa & Guido.

Run 'run.bat' to start a server. It should open a command line which prints: 
Starting server: XXX.XXX.XXX.XXX/30XX
Go to the IP XXX.XXX.XXX.XXX/30XX in your browser to see partygoem running.
If on your first attempt the server has errors in the commandline, it is most likely because you have to do an npm install using your command promp inside the partygoem folder.
If you cannot see the server on that ip, you can try connecting to localhost/30XX. If you can see the server there, you have to portfoward your port 30XX for your local ip.


# HOST A LOBBY

On the display screen an admin logs in at the url of the server in any browser.
They login with credentials given to them by the administrators.
Administrators are free to add any credentials to admin.json. Only the fields "userId", "username" and "pw" are required.
On the display screen the admin can then host a lobby to which phones can connect.
Phones connect via the QR Code on the display screen.