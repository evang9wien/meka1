<script>
    import { onMount } from "svelte";
    import axios from "axios";
    import Icon from "@smui/select/icon";
    import DataTable, { Head, Body, Row, Cell } from "@smui/data-table";
    import Select, { Option } from "@smui/select";
    import { getImage, getLongName } from "./predigt/PredigtConstants.js";
    import CircularProgress from "@smui/circular-progress";
    import Button, { Label } from "@smui/button";
    import IconButton from "@smui/icon-button";

    let selectedTermin;
    let lastSelectedTermin;
    let liederauswahl;
    let termine;
    let verantwortlich;
    onMount(() => {        
        axios
            .get(
                "https://www.evang9.wien/root/wp-json/combo/v1/comboliederauswahl",                
                { 
                    headers: {
                        Cookie: "wp-settings-1=libraryContent%3Dbrowse%26amphidetb%3D1%26ampmfold%3Do; wp-settings-time-1=1671808428; wordpress_test_cookie=WP%20Cookie%20check; wordpress_logged_in_32497b81bace5c58c260b8cdaaa2fcc0=wordpressadmin%7C1699386937%7CGyopCo1CvN8SFS90X0NhKmpX3illzqSiLxDyoyAuZ8k%7C3ad7db7c6723a343f0e0776557322ef89959d01d74de2a608a9dfab3ae904a1d;"
                    },
                })
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
            .get("https://www.evang9.wien/root/wp-json/combo/v1/combotermine?from_date=-50&to_date=10")
            .then((response) => {
                termine = JSON.parse(response.data);
            });
    });

    const handleSelect = (sel) => {
        if(lastSelectedTermin == selectedTermin) 
            return;
        lastSelectedTermin = selectedTermin;    
        window.setTimeout(() => {
            // console.log(JSON.stringify(selectedTermin));
            liederauswahl = undefined;
            axios
                .get(
                    "https://www.evang9.wien/root/wp-json/combo/v1/comboliederauswahl?date=" +
                        selectedTermin
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

<div>
    {#if termine}
        <img
            class="prediger_img"
            alt="prediger"
            src="/comboapps/img/{getImage(verantwortlich)}"
        />

        <Select
            label="Termin"
            bind:value={selectedTermin}
            on:click={handleSelect}
        >
            <Icon class="material-icons" slot="leadingIcon">event</Icon>

            <Option value="" />
            {#each termine as termin}
                <Option value={termin.Termin}>
                    {termin.Termin}
                </Option>
            {/each}
        </Select>
        <!-- <IconButton class="material-icons" on:click={handleSelect}>check</IconButton>         -->
    {/if}
</div>
<br />
<div>
    {#if liederauswahl}
        <DataTable table$aria-label="Liederliste" style="max-width: 100%;">
            <Head>
                <Row>
                    <Cell>Lied</Cell>
                    <Cell>Noten / Hörprobe</Cell>
                </Row>
            </Head>
            <Body>
                {#each liederauswahl as lied}
                    <Row>
                        <Cell>{lied.Beschreibung}</Cell>
                        <Cell>
                            <a
                                href="/root/wp-json/combo/v1/combolied/{lied.Dateiname}?lied={lied.Dateiname}&type=pdf"
                                target="Noten"
                            >
                                <img
                                    title="Noten"
                                    alt="Noten"
                                    src="/graphics/baseline-music_note-24px.svg"
                                />
                                {lied.Titel}
                            </a>
                            <br />
                            {#if lied.MP3 != "0"}
                                <audio
                                    id="player{lied.lied_liste_nummer}"
                                    src="/root/wp-json/combo/v1/combolied/{lied.Dateiname}?lied={lied.Dateiname}&type=mp3"
                                    type="audio/mpeg"
                                    controls
                                    preload="none"
                                />
                            {/if}
                        </Cell>
                    </Row>
                {/each}
            </Body>
        </DataTable>
    {:else}
        <div style="display: flex; justify-content: center">
            <CircularProgress
                style="height: 32px; width: 32px;"
                indeterminate
            />
        </div>
    {/if}
</div>

<style>
    audio::-webkit-media-controls-panel {
        background-color: #ffffff;
    }
    img.prediger_img {
        width: 48px;
        height: 48px;
        border-radius: 50%;
    }
</style>
