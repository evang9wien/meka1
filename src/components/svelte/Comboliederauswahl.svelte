<script>
    import { onMount } from "svelte";
    import axios from "axios";
    import { Label, Select } from 'flowbite-svelte';
    import { Button } from 'flowbite-svelte';
    import { Card } from 'flowbite-svelte';
    
    import { MicrophoneOutline, PlaySolid, PauseSolid } from 'flowbite-svelte-icons';
    import { Table, TableBody, TableBodyCell, TableBodyRow, TableHead, TableHeadCell } from 'flowbite-svelte';
    import { getImage, getLongName } from "./predigt/PredigtConstants.js";

    // import Icon from "@smui/select/icon";
    // import DataTable, { Head, Body, Row, Cell } from "@smui/data-table";
    // import Select, { Option } from "@smui/select";
    
    // import CircularProgress from "@smui/circular-progress";    
    // import IconButton from "@smui/icon-button";
    import {getAuthHeader, isUserAuth} from './auth.js';

    let selectedTermin;
    let lastSelectedTermin;
    let liederauswahl;
    let termine;
    let termineSelect;
    let verantwortlich;
    let userAuth;
    onMount(() => { 
        console.log('onMount');
        userAuth = isUserAuth();            
        axios
            .get(
                "https://evang9.wien/root/wp-json/combo/v2/comboliederauswahl", getAuthHeader()
                )
            .then((response) => {
                liederauswahl = JSON.parse(response.data);
                if (liederauswahl[0]) {
                    const lied1 = liederauswahl[0];
                    selectedTermin = lied1.Termin_Liedliste;
                    lastSelectedTermin = selectedTermin;
                    verantwortlich = lied1.Verantwortlich;
                }
                // console.log(liederauswahl);
            });
        axios
            .get("https://evang9.wien/root/wp-json/combo/v1/combotermine?from_date=-50&to_date=10")
            .then((response) => {
                termine = JSON.parse(response.data);
                termineSelect = termine.map( t => ({name:t.Termin, value: t}));
                console.log(termineSelect);
            });
    });

    const openPdf = (file) => {

        const token = localStorage.getItem("jwt");
        if(token) {
            let headers = new Headers();
            headers.append('Authorization', 'Bearer ' + token);
            headers.append('Content-Type','application/json');
            fetch(file, { headers })
                .then(async response => ({
                    filename: 'downloaded.pdf',                                       
                    blob: await response.blob()
                }))
                .then(resObj => {                    
                    const pdfBlob = new Blob([resObj.blob],{type: 'application/pdf'})
                    let objectUrl = window.URL.createObjectURL(pdfBlob);                                        
                    let link = document.createElement('a');
                    link.href = objectUrl;
                    link.target='_blank';                    
                    link.click();                     
                    window.URL.revokeObjectURL(objectUrl);
            });
        
        };
    }
    
    let source;

    const stopMp3 = () => {
        if(source) {
            source.stop();
        }
    }

    const openMp3 = (file) => {      
       
        if(source) {
            source.stop();
        }
        const context = new AudioContext();
        source = context.createBufferSource();
        source.connect(context.destination);
    
        // const playButton = document.querySelector('#play');
        const token = localStorage.getItem("jwt");    
        let headers = new Headers();
        headers.append('Authorization', 'Bearer ' + token);
        headers.append('Content-Type','application/json');

        window.fetch(file, { headers })
            .then(response => response.arrayBuffer())
            .then(arrayBuffer => context.decodeAudioData(arrayBuffer))
            .then(audioBuffer => {                
                source.buffer = audioBuffer;                
                source.start();
            });
    }

    const handleSelect = (sel) => {
        if(lastSelectedTermin == selectedTermin) 
            return;
        lastSelectedTermin = selectedTermin;    
        window.setTimeout(() => {
            console.log(JSON.stringify(selectedTermin));
            liederauswahl = undefined;
            const token = localStorage.getItem("jwt");
            const authConfig = {
                headers: {
                    Authorization: "Bearer " + token
                }
            }
            axios
                .get(
                    "https://evang9.wien/root/wp-json/combo/v2/comboliederauswahl?date=" +
                        selectedTermin, authConfig
                )
                .then((response) => {
                    liederauswahl = JSON.parse(response.data);

                    if (liederauswahl[0]) {
                        const lied1 = liederauswahl[0];
                        verantwortlich = lied1.Verantwortlich;
                    }
                });
        }, 300);
    };
</script>
<div class=" ">
<Card class="w-full max-w-md ">
{#if userAuth}    
<div>
    {#if termine}
        <img
            class="prediger_img"
            alt="prediger"
            src="https://evang9.wien/comboapps/img/{getImage(verantwortlich)}"
        />

        <Label>
            Termin    
        <Select
            items={termineSelect}
            bind:value={selectedTermin}
            on:change={handleSelect}
        >
            <!-- <Icon class="material-icons" slot="leadingIcon">event</Icon> -->

            <!-- <Option value="" />
            {#each termine as termin}
                <Option value={termin.Termin}>
                    {termin.Termin}
                </Option>
            {/each} -->
        </Select>
        </Label>
        <!-- <IconButton class="material-icons" on:click={handleSelect}>check</IconButton>         -->
    {/if}
</div>
<br />
<div>
    {#if liederauswahl}
        <Table striped="true">
            <TableHead>
                
                    <TableHeadCell>Lied</TableHeadCell>
                    <TableHeadCell>Noten / Hörprobe</TableHeadCell>
                
            </TableHead>
            <TableBody>
                {#each liederauswahl as lied}
                    <TableBodyRow>
                        <TableBodyCell>{lied.Beschreibung}</TableBodyCell>
                        <TableBodyCell class="w-4">
                            <div class="flex flex-row">
                            <MicrophoneOutline size="md"                            
                            on:click={() => {
                                const file = "https://evang9.wien/root/wp-json/combo/v2/combolied/" + lied.Dateiname +"?lied=" + lied.Dateiname +"&type=pdf";
                                openPdf(file);
                                }
                            }/>
                            
                            {lied.Titel}
                            
                            {#if lied.MP3 != "0"}
                            <PlaySolid size="md" on:click={() => {
                                const file = "https://evang9.wien/root/wp-json/combo/v2/combolied/" + lied.Dateiname +"?lied=" + lied.Dateiname +"&type=mp3";
                                openMp3(file);
                                }
                            }></PlaySolid>
                            <PauseSolid size="md" on:click={stopMp3} ></PauseSolid>
                            {/if}
                        </div>
                        </TableBodyCell>
                    </TableBodyRow>
                {/each}
            </TableBody>
        </Table>
    {:else}
        <div style="display: flex; justify-content: center">
            <!-- <CircularProgress
                style="height: 32px; width: 32px;"
                indeterminate
            /> -->
        </div>
    {/if}
</div>
{:else}
Bitte zuerst einloggen.
{/if}
</Card>
</div>
<style>   
    img.prediger_img {
        width: 48px;
        height: 48px;
        border-radius: 50%;
    }
</style>
