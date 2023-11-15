<script>
    import { onMount } from "svelte";
    import axios from "axios";
    import DataTable, { Head, Body, Row, Cell, Label } from "@smui/data-table";
    import { getImage, getLongName } from "./predigt/PredigtConstants.js";
    import Select, { Option } from "@smui/select";
    import CircularProgress from "@smui/circular-progress";
    import IconButton from "@smui/icon-button";
    import FloatingLabel from "@smui/floating-label";
    import Checkbox from "@smui/checkbox";
    import FormField from "@smui/form-field";
    import Textfield from "@smui/textfield";
    import Icon from "@smui/textfield/icon";
    import HelperText from "@smui/textfield/helper-text";
    import {getAuthHeader, isUserAuth} from './auth.js';
    // import Tooltip, {
    //     Wrapper,
    //     Title,
    //     Content,
    //     Link,
    //     RichActions,
    // } from "@smui/tooltip";
    import Dialog, {
        Title,
        Content,
        Actions,
        InitialFocus,
    } from "@smui/dialog";
    import Button, { Label as BtnLabel } from "@smui/button";

    let liederListe;
    let liederListeAll;
    let liederListeKat;

    let open = false;
    let liedtext;
    let liedtitelDlg;
    let response = "Nothing yet.";

    let userAuth;

    const yearNow = new Date().getFullYear(); 

    onMount(() => {
        userAuth = isUserAuth(); 
        loadLieder(yearNow);
    });

    const loadLieder = (year) => {
        axios
            .get(
                "https://www.evang9.wien/root/wp-json/combo/v2/comboLiederChronik?date=" +
                    year, getAuthHeader()
            )
            .then((response) => {
                liederListe = JSON.parse(response.data);

                liederListeAll = liederListe;

                handleSort();
            });
    };
    let sort = "Termin_Liedliste";
    let sortDirection = "decending";
    function handleSort() {
        const sortFct = (a, b) => {
            const [aVal, bVal] = [a[sort], b[sort]][
                sortDirection === "ascending" ? "slice" : "reverse"
            ]();
            if (typeof aVal === "string" && typeof bVal === "string") {
                return aVal.localeCompare(bVal);
            }
            return Number(aVal) - Number(bVal);
        };
        liederListe.sort(sortFct);
        liederListe = liederListe;

        liederListeAll.sort(sortFct);
        liederListeAll = liederListeAll;
    }
    let filterNoten = "";
    let inputA = "";
    let floatingLabelA;

    

    let selectedYear = yearNow;
    let years = [...Array(10).keys()].map( x => yearNow - x);

    function handleYearSelect() {
        setTimeout(() => {
            loadLieder(selectedYear);
        }, 200);
    }
</script>
<center>
{#if userAuth}
<div>
    {#if liederListe}
        <!-- <Dialog
            bind:open
            aria-labelledby="default-focus-title"
            aria-describedby="default-focus-content"
        >
            <Title id="default-focus-title">{liedtitelDlg}</Title>
            <Content id="default-focus-content">
                {liedtext}
            </Content>
            <Actions>                
                <Button style="color:black" defaultAction use={[InitialFocus]}>
                    <Label>Schließen</Label>
                </Button>
            </Actions>
        </Dialog>
    -->
        <div class="columns">            
            <div class="margins">
                <Select
                    bind:value={selectedYear}
                    on:click={handleYearSelect}
                    label="Jahr"
                >
                    {#each years as year}
                        <Option value={year}>{year}</Option>
                    {/each}
                    <svelte:fragment slot="helperText">Auswahl des Jahres.</svelte:fragment>
                </Select>
            </div>
        </div>
        <!-- <IconButton class="material-icons" on:click={handleYearSelect}>search</IconButton> -->

        <!-- <FormField align="end">
            <Checkbox bind:checked={combo} on:input={handleFilterCombo}/>  
            <span slot="label">Combolied</span>                          
        </FormField> -->

        <DataTable
            sortable
            bind:sort
            bind:sortDirection
            on:SMUIDataTable:sorted={handleSort}
            table$aria-label="Liederliste"
            style="width: 100%;"
        >
            <Head>
                <Row>
                    <Cell style="width: 60px;" />
                    <Cell style="width: 20%;" columnId="Termin_Liedliste">
                        <IconButton class="material-icons"
                            >arrow_upward</IconButton
                        ><Label>Termin</Label>
                    </Cell>
                    <Cell style="width: 40%;" columnId="Titel">
                        <IconButton class="material-icons"
                            >arrow_upward</IconButton
                        ><Label>Noten</Label>
                    </Cell>
                    <Cell style="width: 30%;" columnId="Beschreibung">
                        <IconButton class="material-icons"
                            >arrow_upward</IconButton
                        ><Label>gespielt als</Label>
                    </Cell>

                    <Cell style="width: 10%;" columnId="Tasten">
                        <IconButton class="material-icons"
                            >arrow_upward</IconButton
                        ><Label>Piano</Label>
                    </Cell>
                    <!-- <Cell columnId="Kategorie">
                        <IconButton class="material-icons"
                            >arrow_upward</IconButton
                        ><Label>Kategorie</Label></Cell
                    >
                    <Cell columnId="Aktiv"
                        ><IconButton class="material-icons"
                            >arrow_upward</IconButton
                        ><Label>Combolied</Label></Cell
                    > -->
                </Row>
            </Head>
            <Body>
                {#each liederListe as lied}
                    <Row>
                        <Cell style="text-align: center;padding: 6px">
                            <img
                                class="prediger_img"
                                alt="prediger"
                                src="/comboapps/img/{getImage(
                                    lied.Verantwortlich
                                )}"
                            />
                        </Cell>
                        <Cell>
                            {lied.Termin_Liedliste}
                        </Cell>
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
                            </a>
                            <Button
                                style="color:black"
                                on:click={() => (
                                    (open = true),
                                    (liedtext = lied.Liedtext),
                                    (liedtitelDlg = lied.Titel)
                                )}
                            >
                                <Label>{lied.Titel}</Label>
                            </Button>
                            <br />
                            {#if lied.MP3 != "0"}
                                <audio
                                    id="player{lied.lied_liste_nummer}"
                                    src="/root/wp-json/combo/v1/combolied/{lied.Dateiname}?lied={lied.Dateiname}&type=mp3"
                                    controls="controls"
                                    preload="none"
                                />
                            {/if}
                        </Cell>
                        <Cell>
                            {lied.Beschreibung}
                        </Cell>
                        <Cell>
                            {lied.Tasten}
                        </Cell>
                        <!-- <Cell>
                            {lied.zuletzt < 2000
                                ? lied.zuletzt + " Wochen"
                                : ""}
                        </Cell> -->
                        <!-- <Cell>
                            {lied.Kategorie}
                        </Cell>
                        <Cell>
                            {lied.Aktiv == 1 ? "Ja" : "Nein"}
                        </Cell> -->
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
{:else}
Bitte zuerst einloggen.
{/if}
</center>
<style>
    .columns {
        display: flex;
        flex-wrap: wrap;
    }
    .margins {
        margin-right: 12px;
        margin-bottom: 12px;
    }

    
    img.prediger_img {
        width: 48px;
        height: 48px;
        border-radius: 50%;
    }

    :global(label) {
        color: #005091;
    }

    audio::-webkit-media-controls-panel {
        background-color: #ffffff;
    }

    :root {
        --mdc-theme-primary: #005091;
        --mdc-theme-secondary: #005091;
        --mdc-theme-background: #fff;
        --mdc-theme-surface: #fff;
        --mdc-theme-error: #b71c1c;
        --mdc-theme-on-primary: #fff;
        --mdc-theme-on-secondary: #fff;
        --mdc-theme-on-surface: #000;
        --mdc-theme-on-error: #fff;
        --mdc-theme-text-primary-on-background: rgba(0, 0, 0, 0.87);
        --mdc-theme-text-secondary-on-background: rgba(0, 0, 0, 0.54);
        --mdc-theme-text-hint-on-background: rgba(0, 0, 0, 0.38);
        --mdc-theme-text-disabled-on-background: rgba(0, 0, 0, 0.38);
        --mdc-theme-text-icon-on-background: rgba(0, 0, 0, 0.38);
        --mdc-theme-text-primary-on-light: rgba(0, 0, 0, 0.87);
        --mdc-theme-text-secondary-on-light: rgba(0, 0, 0, 0.54);
        --mdc-theme-text-hint-on-light: rgba(0, 0, 0, 0.38);
        --mdc-theme-text-disabled-on-light: rgba(0, 0, 0, 0.38);
        --mdc-theme-text-icon-on-light: rgba(0, 0, 0, 0.38);
        --mdc-theme-text-primary-on-dark: white;
        --mdc-theme-text-secondary-on-dark: rgba(255, 255, 255, 0.7);
        --mdc-theme-text-hint-on-dark: rgba(255, 255, 255, 0.5);
        --mdc-theme-text-disabled-on-dark: rgba(255, 255, 255, 0.5);
        --mdc-theme-text-icon-on-dark: rgba(255, 255, 255, 0.5);
    }
</style>
