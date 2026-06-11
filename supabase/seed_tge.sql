with q as (insert into tge_questions(topic,kind,difficulty,prompt,active) values ('Estado','closed','media','São elementos clássicos do Estado:',true) returning id)
insert into tge_options(question_id,text,is_correct) select id,'Povo, território e soberania', true from q
union all select id,'População, mercado e governo', false from q
union all select id,'Nação, cultura e religião', false from q
union all select id,'Judiciário, povo e economia', false from q
union all select id,'Território, município e família', false from q
;
with q as (insert into tge_questions(topic,kind,difficulty,prompt,active) values ('Soberania','closed','media','Soberania é:',true) returning id)
insert into tge_options(question_id,text,is_correct) select id,'poder supremo interno e independente no plano externo', true from q
union all select id,'poder econômico do governo', false from q
union all select id,'submissão a outro Estado', false from q
union all select id,'sinônimo de população', false from q
union all select id,'direito de qualquer grupo criar leis', false from q
;
with q as (insert into tge_questions(topic,kind,difficulty,prompt,active) values ('Povo','closed','media','Povo difere de população porque:',true) returning id)
insert into tge_options(question_id,text,is_correct) select id,'povo é vínculo jurídico-político; população é dado demográfico', true from q
union all select id,'são idênticos', false from q
union all select id,'população é apenas quem vota', false from q
union all select id,'povo é qualquer turista', false from q
union all select id,'população é cidadania', false from q
;
with q as (insert into tge_questions(topic,kind,difficulty,prompt,active) values ('Nação','closed','media','Nação se liga a:',true) returning id)
insert into tge_options(question_id,text,is_correct) select id,'identidade histórico-cultural', true from q
union all select id,'território delimitado', false from q
union all select id,'poder de tributar', false from q
union all select id,'estrutura do governo', false from q
union all select id,'poder derivado', false from q
;
with q as (insert into tge_questions(topic,kind,difficulty,prompt,active) values ('Forma de Estado','closed','media','Unitário e federação indicam:',true) returning id)
insert into tge_options(question_id,text,is_correct) select id,'forma de Estado', true from q
union all select id,'forma de governo', false from q
union all select id,'sistema eleitoral', false from q
union all select id,'regime econômico', false from q
union all select id,'nacionalidade', false from q
;
with q as (insert into tge_questions(topic,kind,difficulty,prompt,active) values ('Forma de governo','closed','media','República e monarquia indicam:',true) returning id)
insert into tge_options(question_id,text,is_correct) select id,'forma de governo', true from q
union all select id,'forma de Estado', false from q
union all select id,'sistema de governo', false from q
union all select id,'território', false from q
union all select id,'soberania', false from q
;
with q as (insert into tge_questions(topic,kind,difficulty,prompt,active) values ('Sistema de governo','closed','media','Presidencialismo e parlamentarismo são:',true) returning id)
insert into tge_options(question_id,text,is_correct) select id,'sistemas de governo', true from q
union all select id,'formas de Estado', false from q
union all select id,'tipos de território', false from q
union all select id,'fontes do Direito', false from q
union all select id,'nações', false from q
;
with q as (insert into tge_questions(topic,kind,difficulty,prompt,active) values ('Democracia','closed','media','Democracia pressupõe:',true) returning id)
insert into tge_options(question_id,text,is_correct) select id,'participação popular e legitimidade do poder', true from q
union all select id,'ausência de governo', false from q
union all select id,'poder hereditário absoluto', false from q
union all select id,'negação de direitos políticos', false from q
union all select id,'governo sem povo', false from q
;
with q as (insert into tge_questions(topic,kind,difficulty,prompt,active) values ('Estado de Direito','closed','media','Estado de Direito significa:',true) returning id)
insert into tge_options(question_id,text,is_correct) select id,'submissão do poder estatal à ordem jurídica', true from q
union all select id,'governante acima da lei', false from q
union all select id,'lei sem limitar Estado', false from q
union all select id,'ausência de controle', false from q
union all select id,'Constituição facultativa', false from q
;
with q as (insert into tge_questions(topic,kind,difficulty,prompt,active) values ('Separação','closed','media','Separação dos poderes busca:',true) returning id)
insert into tge_options(question_id,text,is_correct) select id,'limitar o poder por funções distintas', true from q
union all select id,'eliminar Executivo', false from q
union all select id,'concentrar poder', false from q
union all select id,'impedir controles', false from q
union all select id,'abolir Constituição', false from q
;
with q as (insert into tge_questions(topic,kind,difficulty,prompt,active) values ('Estado II','closed','media','São elementos clássicos do Estado:',true) returning id)
insert into tge_options(question_id,text,is_correct) select id,'Povo, território e soberania', true from q
union all select id,'População, mercado e governo', false from q
union all select id,'Nação, cultura e religião', false from q
union all select id,'Judiciário, povo e economia', false from q
union all select id,'Território, município e família', false from q
;
with q as (insert into tge_questions(topic,kind,difficulty,prompt,active) values ('Soberania II','closed','media','Soberania é:',true) returning id)
insert into tge_options(question_id,text,is_correct) select id,'poder supremo interno e independente no plano externo', true from q
union all select id,'poder econômico do governo', false from q
union all select id,'submissão a outro Estado', false from q
union all select id,'sinônimo de população', false from q
union all select id,'direito de qualquer grupo criar leis', false from q
;
with q as (insert into tge_questions(topic,kind,difficulty,prompt,active) values ('Povo II','closed','media','Povo difere de população porque:',true) returning id)
insert into tge_options(question_id,text,is_correct) select id,'povo é vínculo jurídico-político; população é dado demográfico', true from q
union all select id,'são idênticos', false from q
union all select id,'população é apenas quem vota', false from q
union all select id,'povo é qualquer turista', false from q
union all select id,'população é cidadania', false from q
;
with q as (insert into tge_questions(topic,kind,difficulty,prompt,active) values ('Nação II','closed','media','Nação se liga a:',true) returning id)
insert into tge_options(question_id,text,is_correct) select id,'identidade histórico-cultural', true from q
union all select id,'território delimitado', false from q
union all select id,'poder de tributar', false from q
union all select id,'estrutura do governo', false from q
union all select id,'poder derivado', false from q
;
with q as (insert into tge_questions(topic,kind,difficulty,prompt,active) values ('Forma de Estado II','closed','media','Unitário e federação indicam:',true) returning id)
insert into tge_options(question_id,text,is_correct) select id,'forma de Estado', true from q
union all select id,'forma de governo', false from q
union all select id,'sistema eleitoral', false from q
union all select id,'regime econômico', false from q
union all select id,'nacionalidade', false from q
;
with q as (insert into tge_questions(topic,kind,difficulty,prompt,active) values ('Forma de governo II','closed','media','República e monarquia indicam:',true) returning id)
insert into tge_options(question_id,text,is_correct) select id,'forma de governo', true from q
union all select id,'forma de Estado', false from q
union all select id,'sistema de governo', false from q
union all select id,'território', false from q
union all select id,'soberania', false from q
;
with q as (insert into tge_questions(topic,kind,difficulty,prompt,active) values ('Sistema de governo II','closed','media','Presidencialismo e parlamentarismo são:',true) returning id)
insert into tge_options(question_id,text,is_correct) select id,'sistemas de governo', true from q
union all select id,'formas de Estado', false from q
union all select id,'tipos de território', false from q
union all select id,'fontes do Direito', false from q
union all select id,'nações', false from q
;
with q as (insert into tge_questions(topic,kind,difficulty,prompt,active) values ('Democracia II','closed','media','Democracia pressupõe:',true) returning id)
insert into tge_options(question_id,text,is_correct) select id,'participação popular e legitimidade do poder', true from q
union all select id,'ausência de governo', false from q
union all select id,'poder hereditário absoluto', false from q
union all select id,'negação de direitos políticos', false from q
union all select id,'governo sem povo', false from q
;
with q as (insert into tge_questions(topic,kind,difficulty,prompt,active) values ('Estado de Direito II','closed','media','Estado de Direito significa:',true) returning id)
insert into tge_options(question_id,text,is_correct) select id,'submissão do poder estatal à ordem jurídica', true from q
union all select id,'governante acima da lei', false from q
union all select id,'lei sem limitar Estado', false from q
union all select id,'ausência de controle', false from q
union all select id,'Constituição facultativa', false from q
;
with q as (insert into tge_questions(topic,kind,difficulty,prompt,active) values ('Separação II','closed','media','Separação dos poderes busca:',true) returning id)
insert into tge_options(question_id,text,is_correct) select id,'limitar o poder por funções distintas', true from q
union all select id,'eliminar Executivo', false from q
union all select id,'concentrar poder', false from q
union all select id,'impedir controles', false from q
union all select id,'abolir Constituição', false from q
;
with q as (insert into tge_questions(topic,kind,difficulty,prompt,active) values ('Estado','closed','media','São elementos clássicos do Estado:',true) returning id)
insert into tge_options(question_id,text,is_correct) select id,'Povo, território e soberania', true from q
union all select id,'População, mercado e governo', false from q
union all select id,'Nação, cultura e religião', false from q
union all select id,'Judiciário, povo e economia', false from q
union all select id,'Território, município e família', false from q
;
with q as (insert into tge_questions(topic,kind,difficulty,prompt,active) values ('Soberania','closed','media','Soberania é:',true) returning id)
insert into tge_options(question_id,text,is_correct) select id,'poder supremo interno e independente no plano externo', true from q
union all select id,'poder econômico do governo', false from q
union all select id,'submissão a outro Estado', false from q
union all select id,'sinônimo de população', false from q
union all select id,'direito de qualquer grupo criar leis', false from q
;
insert into tge_questions(topic,kind,difficulty,prompt,expected_answer,rubric,active) values ('Estado','open','media','Conceitue Estado e mencione seus elementos essenciais.','Estado é organização político-jurídica formada por povo, território e soberania.','0 a 2 conforme conceitue Estado e explique povo, território e soberania.',true);
insert into tge_questions(topic,kind,difficulty,prompt,expected_answer,rubric,active) values ('Soberania','open','media','Explique soberania interna e externa.','Interna é poder supremo no território; externa é independência perante outros Estados.','0 a 2 conforme diferencie as duas dimensões.',true);
insert into tge_questions(topic,kind,difficulty,prompt,expected_answer,rubric,active) values ('Povo','open','media','Diferencie povo, população e nação.','Povo é vínculo jurídico-político; população é habitantes; nação é identidade histórico-cultural.','0 a 2 conforme diferencie os três.',true);
insert into tge_questions(topic,kind,difficulty,prompt,expected_answer,rubric,active) values ('Federalismo','open','media','Diferencie Estado unitário e federal.','Unitário concentra poder; federal reparte autonomia entre entes.','0 a 2 conforme compare centralização e autonomia.',true);
insert into tge_questions(topic,kind,difficulty,prompt,expected_answer,rubric,active) values ('Governo','open','media','Diferencie república e monarquia.','República tem temporariedade, eletividade e responsabilidade; monarquia tende à hereditariedade e vitaliciedade.','0 a 2 conforme apresente critérios.',true);
insert into tge_questions(topic,kind,difficulty,prompt,expected_answer,rubric,active) values ('Sistemas','open','media','Diferencie presidencialismo e parlamentarismo.','Presidencialismo separa chefia e mandato fixo; parlamentarismo depende da confiança do Parlamento.','0 a 2 conforme compare.',true);
insert into tge_questions(topic,kind,difficulty,prompt,expected_answer,rubric,active) values ('Democracia','open','media','Explique democracia direta, indireta e semidireta.','Direta: povo decide; indireta: representantes; semidireta: plebiscito/referendo etc.','0 a 2 conforme conceitue as três.',true);
insert into tge_questions(topic,kind,difficulty,prompt,expected_answer,rubric,active) values ('Estado de Direito','open','media','Explique Estado de Direito.','Estado submetido à ordem jurídica, com limitação do poder e proteção de direitos.','0 a 2 conforme mencione lei, controle e direitos.',true);
insert into tge_questions(topic,kind,difficulty,prompt,expected_answer,rubric,active) values ('Poderes','open','media','Explique a importância da separação dos poderes.','Limita o poder, distribui funções e permite controles recíprocos.','0 a 2 conforme explique controle.',true);
insert into tge_questions(topic,kind,difficulty,prompt,expected_answer,rubric,active) values ('Constituinte','open','media','Explique poder constituinte originário e derivado.','Originário cria Constituição; derivado altera dentro dos limites dela.','0 a 2 conforme diferencie.',true);
