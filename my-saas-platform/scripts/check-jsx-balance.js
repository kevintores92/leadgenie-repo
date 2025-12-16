const fs=require('fs');
const s=fs.readFileSync('apps/frontend/features/messenger/ContactSidebar.jsx','utf8');
let i=0, line=1, col=1; const stack=[];
let inSingle=false, inDouble=false, inTemplate=false, inJS=false; while(i<s.length){const c=s[i];
 if(c==='\n'){line++;col=1;i++;continue;}
 if(!inSingle && !inDouble && !inTemplate && c==='{'){inJS=true; i++; col++; continue}
 if(inJS && c==='}'){inJS=false; i++; col++; continue}
 if(inJS){ i++; col++; continue}
 if(inSingle){ if(c==='\\') { i+=2; col+=2; continue } if(c==="'"){inSingle=false} i++; col++; continue}
 if(inDouble){ if(c==='\\') { i+=2; col+=2; continue } if(c==='"'){inDouble=false} i++; col++; continue}
 if(inTemplate){ if(c==='`'){inTemplate=false} i++; col++; continue}
 if(c==="'"){inSingle=true;i++;col++;continue}
 if(c==='"'){inDouble=true;i++;col++;continue}
 if(c==='`'){inTemplate=true;i++;col++;continue}
 if(c==='<' && /[A-Za-z\//]/.test(s[i+1])){
   let j=i+1; let closing=false; if(s[j]==='/'){closing=true;j++;}
   let tag=''; while(j<s.length && /[A-Za-z0-9\-]/.test(s[j])){tag+=s[j]; j++;}
   let self=false; while(j<s.length && s[j]!=='>'){ if(s[j]=='/') self=true; j++;}
   if(s[j]==='>'){
     if(closing){ if(stack.length===0||stack[stack.length-1]!==tag){ console.log('MISMATCH closing',tag,'at',line, col); } else stack.pop(); }
     else if(self){ }
     else { stack.push(tag); }
     i=j+1; col+= (j-i)+1; continue;
   } else { console.log('Unterminated tag at',line); break }
 }
 i++; col++;
}
console.log('stack tail:', stack.slice(-8), 'size', stack.length);
