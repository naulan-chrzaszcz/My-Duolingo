import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _env import *  # APP_URL, SITE, SITE_DB, OUT, TESTS
import json,urllib.request,datetime,sqlite3,os
U=SITE+'api/account.php?a='
def call(a,body):
    r=urllib.request.Request(U+a,data=json.dumps(body).encode(),headers={'Content-Type':'application/json'})
    op=urllib.request.build_opener(urllib.request.ProxyHandler({}))
    try: return json.loads(op.open(r,timeout=10).read())
    except urllib.error.HTTPError as e: return {'http':e.code,**json.loads(e.read() or b'{}')}
today=datetime.date.today(); mon=today-datetime.timedelta(days=today.weekday())
W=lambda k:(mon-datetime.timedelta(days=7*k)).isoformat()
# la base existante (créée avec l'ancienne version par le test précédent) doit être migrée sans perte
pass
tok={}
for n in ['Ana','Ben','Chloé','Dan','민지']:
    j=call('register',{'name':n,'password':'secret12','emoji':'🐼','color':'#22B573'}); tok[n]=j.get('token'); assert j['ok'],j
st=json.dumps({'xp':1})
# il y a 2 semaines
for n,x in [('Ana',500),('Ben',300),('Chloé',100),('Dan',50)]: call('save',{'token':tok[n],'state':st,'ts':1,'wxp':x,'week':W(2),'xp':x,'streak':3})
# la semaine dernière (Dan n'a pas joué, 민지 arrive)
for n,x in [('Ben',900),('Ana',400),('민지',650),('Chloé',20)]: call('save',{'token':tok[n],'state':st,'ts':2,'wxp':x,'week':W(1),'xp':1000+x,'streak':10})
# cette semaine
for n,x in [('민지',120),('Ana',80),('Chloé',300)]: call('save',{'token':tok[n],'state':st,'ts':3,'wxp':x,'week':W(0),'xp':2000+x,'streak':12})
# un vieil appareil de Ana resté sur la semaine dernière ne doit pas écraser sa semaine en cours
call('save',{'token':tok['Ana'],'state':st,'ts':4,'wxp':450,'week':W(1),'xp':2080,'streak':12})
j=call('board',{'week':W(0),'prev':W(1),'token':tok['Ana']})
print('cette semaine :',[(r['name'],r['wxp'],r['m']) for r in j['rows']])
print('depuis toujours :',[(r['name'],r['xp'],r['streak']) for r in j['all']][:6])
print('podium semaine dernière :',[(r['name'],r['wxp']) for r in j['last']])
print('moi (Ana) :',j['me'],'| membres',j['members'])
print('Ben (n\'a pas joué cette semaine) :',call('board',{'week':W(0),'prev':W(1),'token':tok['Ben']})['me'])
db=sqlite3.connect(SITE_DB)
print('podiums figés :',db.execute('SELECT week,(SELECT name FROM users WHERE id=uid),rank,wxp FROM podiums ORDER BY week,rank').fetchall())
print('semaine future refusée :',call('board',{'week':'2099-01-04'}),'| format invalide :',call('board',{'week':"x' OR 1=1"}))
print('sans jeton (visiteur) :',{k:(len(v) if isinstance(v,list) else v) for k,v in call('board',{'week':W(0),'prev':W(1)}).items()})
